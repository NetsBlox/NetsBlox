'use strict';
const getRPCLogger = require('../utils/logger');
const acl = require('../roboscape/accessControl');
const PHONE_IOT_MODE = process.env.PHONE_IOT_MODE || 'both';
const ciphers = require('../roboscape/ciphers');
const common = require('./common');
const { definedOrThrow } = require('./common');

// network protocols (UDP unless otherwise stated)
// A - accelerometer
// a - authenticate
// B - add custom button control
// b - button press event
// C - clear custom controls
// c - remove custom control
// G - gravity
// g - add custom label control
// H - set text
// h - get text
// I - heartbeat
// i - set image
// L - linear acceleration
// l - light level
// M - magnetic field
// m - microphone level
// O - orientation calculator
// P - proximity
// R - rotation vector
// r - game rotation vector
// S - step counter
// T - add custom text field
// t - text field content
// U - add custom image box
// u - image box content
// v - image box updated
// W - get toggle state
// X - location (latlong + bearing + altitude)
// Y - gyroscope
// y - add custom radiobutton control
// Z - add custom checkbox control
// z - checkbox press event

// these might be better defined as an attribute on the device
const FORGET_TIME = 120; // forgetting a device in seconds
const RESPONSE_TIMEOUT = 2000; // ms (well over worst case)

const DIRECTIONS_3D = [
    [[0, 0, 1], 'up'],
    [[0, 0, -1], 'down'],
    [[0, 1, 0], 'vertical'],
    [[0, -1, 0], 'upside down'],
    [[1, 0, 0], 'left'],
    [[-1, 0, 0], 'right'],  
];
const COMPASS_DIRECTIONS_4 = [
    [0, 'N'],
    [90, 'E'],
    [-90, 'W'],
    [180, 'S'],
    [-180, 'S'],
];
const COMPASS_DIRECTIONS_8 = [
    [0, 'N'],
    [45, 'NE'],
    [-45, 'NW'],
    [90, 'E'],
    [-90, 'W'],
    [135, 'SE'],
    [-135, 'SW'],
    [180, 'S'],
    [-180, 'S'],
];

const Device = function (mac_addr, ip4_addr, ip4_port, aServer) {
    this.id = mac_addr;
    this.mac_addr = mac_addr;
    this.ip4_addr = ip4_addr;
    this.ip4_port = ip4_port;
    this.heartbeats = 0;
    this.timestamp = -1; // time of last message in device time
    this.sockets = []; // uuids of sockets of registered clients
    this.callbacks = {}; // callbacks keyed by msgType
    this.encryptionKey = [0]; // encryption key
    this.encryptionMethod = ciphers.caesar; // backward compat
    this.buttonDownTime = 0; // last time button was pressed
    // rate control
    this.totalCount = 0; // in messages per second
    this.totalRate = 0; // in messages per second
    this.clientRate = 0; // in messages per second
    this.clientPenalty = 0; // in seconds
    this.clientCounts = {};
    this.lastSeqNum = -1; // initially disabled
    this._logger = getRPCLogger(`PhoneIoT:${mac_addr}`);
    this.server = aServer; // a handle to the udp server for communication with the device

    this.credentials = {}; // Map<ClientID, password>

    this.guiIdToEvent = {}; // Map<GUI ID, Event ID>
    this.guiListeners = {}; // Map<ClientID, Socket>
};

Device.prototype.getPassword = function (clientId) {
    const pass = this.credentials[clientId];
    if (pass === undefined) throw Error('no login credentials set for this device');
    return pass;
};

Device.prototype.setTotalRate = function (rate) {
    this._logger.log('set total rate ' + this.mac_addr + ' ' + rate);
    this.totalRate = Math.max(rate, 0);
};

Device.prototype.setClientRate = function (rate, penalty) {
    this._logger.log('set client rate ' + this.mac_addr + ' ' + rate + ' ' + penalty);
    this.clientRate = Math.max(rate, 0);
    this.clientPenalty = Math.min(Math.max(penalty, 0), 60);
};

Device.prototype.resetRates = function () {
    this._logger.log('reset rate limits');
    this.totalRate = 0;
    this.clientRate = 0;
    this.clientPenalty = 0;
    this.clientCounts = {};
};

// resets the encryption
// for backward compat sets it to caesar cipher with key [0]
Device.prototype.resetEncryption = function () {
    this._logger.log('resetting encryption');
    // null would make more sense but keeping backward compatibility here
    this.encryptionMethod = ciphers.caesar;
    this.encryptionKey = [0];
};

Device.prototype.resetSeqNum = function () {
    this._logger.log('resetting seq numbering');
    this.setSeqNum(-1);
};

Device.prototype.updateAddress = function (ip4_addr, ip4_port) {
    this.ip4_addr = ip4_addr;
    this.ip4_port = ip4_port;
    this.heartbeats = 0;
};

Device.prototype.setSeqNum = function (seqNum) {
    this.lastSeqNum = seqNum;
};

Device.prototype.accepts = function (clientId, seqNum) {
    if (this.lastSeqNum >= 0 && (seqNum <= this.lastSeqNum ||
            seqNum > this.lastSeqNum + 100)) {
        return false;
    }

    let client = this.clientCounts[clientId];
    if (!client) {
        client = {
            count: 0,
            penalty: 0
        };
        this.clientCounts[clientId] = client;
    }

    if (client.penalty > 0) {
        this._logger.log(clientId + ' client penalty');
        return false;
    }

    if (this.clientRate !== 0 && client.count + 1 > this.clientRate) {
        this._logger.log(clientId + ' client rate violation');
        client.penalty = 1 + this.clientPenalty;
        return false;
    }

    if (this.totalRate !== 0 && this.totalCount + 1 > this.totalRate) {
        this._logger.log(clientId + ' total rate violation');
        return false;
    }

    this.totalCount += 1;
    client.count += 1;
    return true;
};

Device.prototype.heartbeat = function () {
    this.totalCount = 0;
    for (const id in this.clientCounts) {
        const client = this.clientCounts[id];
        client.count = 0;
        if (client.penalty > 1) {
            client.count = 0;
            client.penalty -= 1;
        }
        else delete this.clientCounts[id];
    }

    this.heartbeats += 1;
    return this.heartbeats <= FORGET_TIME;
};
Device.prototype.isAlive = function () {
    return this.heartbeats <= 2;
};
Device.prototype.isMostlyAlive = function () {
    return this.heartbeats <= FORGET_TIME;
};

Device.prototype.addClientSocket = function (socket) {
    const {clientId} = socket;
    const i = this.sockets.findIndex(s => s.clientId === clientId);
    if (i < 0) {
        this._logger.log('register ' + clientId + ' ' + this.mac_addr);
        this.sockets.push(socket);
        return true;
    }
    return false;
};

Device.prototype.removeClientSocket = function (socket) {
    const {clientId} = socket;
    const i = this.sockets.findIndex(s => s.clientId === clientId);
    if (i >= 0) {
        this._logger.log('unregister ' + clientId + ' ' + this.mac_addr);
        this.sockets.splice(i, 1);
        return true;
    }
    return false;
};

Device.prototype.sendToDevice = function (message) {
    this.server.send(message, this.ip4_port, this.ip4_addr, function (err) {
        if (err) {
            this._logger.log('send error ' + err);
        }
    });
};

Device.prototype.receiveFromDevice = function (msgType, timeout) {
    if (!this.callbacks[msgType]) {
        this.callbacks[msgType] = [];
    }
    const callbacks = this.callbacks[msgType];

    return new Promise(function (resolve, reject) {
        callbacks.push(resolve);
        setTimeout(function () {
            const i = callbacks.indexOf(resolve);
            if (i >= 0) callbacks.splice(i, 1);
            reject(Error('response timeout'));
        }, timeout || RESPONSE_TIMEOUT);
    });
};

Device.prototype.authenticate = async function (device, args, clientId) {
    const password = this.getPassword(clientId);

    this._logger.log('authenticate ' + this.mac_addr);
    const response = this.receiveFromDevice('auth');
    const message = Buffer.alloc(9);
    message.write('a', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    this.sendToDevice(message);

    const err = (await response).err;
    if (err !== undefined) throw Error(err);
};

Device.prototype.clearControls = async function (device, args, clientId) {
    const password = this.getPassword(clientId);

    this._logger.log('clear controls ' + this.mac_addr);
    const response = this.receiveFromDevice('clearcontrols');
    const message = Buffer.alloc(9);
    message.write('C', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    this.sendToDevice(message);

    const err = (await response).err;
    if (err !== undefined) throw Error(err);
};
Device.prototype.removeControl = async function (device, args, clientId) {
    const password = this.getPassword(clientId);

    this._logger.log('remove control ' + this.mac_addr);
    const response = this.receiveFromDevice('removecontrol');

    const id = Buffer.from(args[0], 'utf8');
    if (id.length > 255) throw new Error('id too long');

    const message = Buffer.alloc(9);
    message.write('c', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    this.sendToDevice(Buffer.concat([message, id]));

    const err = (await response).err;
    if (err !== undefined) throw Error(err);
};
Device.prototype.addButton = async function (device, args, clientId) {
    const password = this.getPassword(clientId);

    this._logger.log('add button ' + this.mac_addr);
    const response = this.receiveFromDevice('addbutton');

    const id = Buffer.from(args[6], 'utf8');
    if (id.length > 255) throw new Error('id too long');

    const message = Buffer.alloc(34);
    message.write('B', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    message.writeFloatBE(args[0], 9);
    message.writeFloatBE(args[1], 13);
    message.writeFloatBE(args[2], 17);
    message.writeFloatBE(args[3], 21);
    message.writeInt32BE(args[4], 25);
    message.writeInt32BE(args[5], 29);
    message[33] = id.length;

    const text = Buffer.from(args[8], 'utf8');
    this.sendToDevice(Buffer.concat([message, id, text]));
    
    const err = (await response).err;
    if (err !== undefined) throw Error(err);

    device.guiIdToEvent[args[6]] = args[7];
};
Device.prototype.addImageDisplay = async function (device, args, clientId) {
    const password = this.getPassword(clientId);
    
    this._logger.log('add image display ' + this.mac_addr);
    const response = this.receiveFromDevice('addimagedisplay');

    const id = Buffer.from(args[4], 'utf8');
    if (id.length > 255) throw new Error('id too long');

    const message = Buffer.alloc(25);
    message.write('U', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    message.writeFloatBE(args[0], 9);
    message.writeFloatBE(args[1], 13);
    message.writeFloatBE(args[2], 17);
    message.writeFloatBE(args[3], 21);
    this.sendToDevice(Buffer.concat([message, id]));
    
    const err = (await response).err;
    if (err !== undefined) throw Error(err);

    device.guiIdToEvent[args[4]] = args[5];
};
Device.prototype.getImage = async function (device, args, clientId) {
    const password = this.getPassword(clientId);
    
    this._logger.log('get image ' + this.mac_addr);
    const response = this.receiveFromDevice('getimage');

    const id = Buffer.from(args[0], 'utf8');
    if (id.length > 255) throw new Error('id too long');

    const message = Buffer.alloc(9);
    message.write('u', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    this.sendToDevice(Buffer.concat([message, id]));
    
    const img = (await response).img;
    if (img === undefined) throw new Error('no image display with matching id');
    return img;
};
Device.prototype.setImage = async function (device, args, clientId) {
    const password = this.getPassword(clientId);

    this._logger.log('set image ' + this.mac_addr);
    const response = this.receiveFromDevice('setimage');

    const id = Buffer.from(args[0], 'utf8');
    if (id.length > 255) throw new Error('id too long');

    const message = Buffer.alloc(10);
    message.write('i', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    message[9] = id.length;

    const img = await common.prepImageToSend(args[1]);
    this.sendToDevice(Buffer.concat([message, id, img]));
    
    const err = (await response).err;
    if (err !== undefined) throw Error(err);
};
Device.prototype.setText = async function (device, args, clientId) {
    const password = this.getPassword(clientId);

    this._logger.log('set text ' + this.mac_addr);
    const response = this.receiveFromDevice('settext');

    const id = Buffer.from(args[0], 'utf8');
    if (id.length > 255) throw new Error('id too long');

    const message = Buffer.alloc(10);
    message.write('H', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    message[9] = id.length;

    const text = Buffer.from(args[1], 'utf8');
    this.sendToDevice(Buffer.concat([message, id, text]));
    
    const err = (await response).err;
    if (err !== undefined) throw Error(err);
};
Device.prototype.getText = async function (device, args, clientId) {
    const password = this.getPassword(clientId);

    this._logger.log('get text ' + this.mac_addr);
    const response = this.receiveFromDevice('gettext');

    const id = Buffer.from(args[0], 'utf8');
    if (id.length > 255) throw new Error('id too long');

    const message = Buffer.alloc(9);
    message.write('h', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    this.sendToDevice(Buffer.concat([message, id]));
    
    const text = (await response).text;
    if (text === undefined) throw Error('no text with matching id');
    return text;
};
Device.prototype.addTextField = async function (device, args, clientId) {
    const password = this.getPassword(clientId);
    
    this._logger.log('add text field ' + this.mac_addr);
    const response = this.receiveFromDevice('addtextfield');

    const id = Buffer.from(args[6], 'utf8');
    if (id.length > 255) throw new Error('id too long');

    const message = Buffer.alloc(34);
    message.write('T', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    message.writeFloatBE(args[0], 9);
    message.writeFloatBE(args[1], 13);
    message.writeFloatBE(args[2], 17);
    message.writeFloatBE(args[3], 21);
    message.writeInt32BE(args[4], 25);
    message.writeInt32BE(args[5], 29);
    message[33] = id.length;

    const text = Buffer.from(args[8], 'utf8');
    this.sendToDevice(Buffer.concat([message, id, text]));
    
    const err = (await response).err;
    if (err !== undefined) throw Error(err);

    device.guiIdToEvent[args[6]] = args[7];
};
Device.prototype.addLabel = async function (device, args, clientId) {
    const password = this.getPassword(clientId);
    
    this._logger.log('add label ' + this.mac_addr);
    const response = this.receiveFromDevice('addlabel');

    const id = Buffer.from(args[3], 'utf8');
    if (id.length > 255) throw new Error('id too long');

    const message = Buffer.alloc(22);
    message.write('g', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    message.writeFloatBE(args[0], 9);
    message.writeFloatBE(args[1], 13);
    message.writeInt32BE(args[2], 17);
    message[21] = id.length;

    const text = Buffer.from(args[4], 'utf8');
    this.sendToDevice(Buffer.concat([message, id, text]));
    
    const err = (await response).err;
    if (err !== undefined) throw Error(err);
};
Device.prototype.addCheckboxWithStyle = async function (device, args, style, clientId) {
    const password = this.getPassword(clientId);
    
    this._logger.log('add checkbox ' + this.mac_addr);
    const response = this.receiveFromDevice('addcheckbox');

    const id = Buffer.from(args[5], 'utf8');
    if (id.length > 255) throw new Error('id too long');

    const message = Buffer.alloc(28);
    message.write('Z', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    message.writeFloatBE(args[0], 9);
    message.writeFloatBE(args[1], 13);
    message.writeInt32BE(args[2], 17);
    message.writeInt32BE(args[3], 21);
    message[25] = args[4] ? 1 : 0;
    message[26] = style;
    message[27] = id.length;

    const text = Buffer.from(args[7], 'utf8');
    this.sendToDevice(Buffer.concat([message, id, text]));
    
    const err = (await response).err;
    if (err !== undefined) throw Error(err);

    device.guiIdToEvent[args[5]] = args[6];
};
Device.prototype.addCheckbox = async function (device, args, clientId) {
    return this.addCheckboxWithStyle(device, args, 0, clientId);
};
Device.prototype.addToggleswitch = async function (device, args, clientId) {
    return this.addCheckboxWithStyle(device, args, 1, clientId);
};
Device.prototype.addRadioButton = async function (device, args, clientId) {
    const password = this.getPassword(clientId);
    
    this._logger.log('add radio button ' + this.mac_addr);
    const response = this.receiveFromDevice('addradiobutton');

    const id = Buffer.from(args[5], 'utf8');
    if (id.length > 255) throw new Error('id too long');

    const group = Buffer.from(args[6], 'utf8');
    if (group.length > 255) throw new Error('group too long');
    const groupPrefix = Buffer.alloc(1);
    groupPrefix[0] = group.length;

    const message = Buffer.alloc(27);
    message.write('y', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    message.writeFloatBE(args[0], 9);
    message.writeFloatBE(args[1], 13);
    message.writeInt32BE(args[2], 17);
    message.writeInt32BE(args[3], 21);
    message[25] = args[4] ? 1 : 0;
    message[26] = id.length;

    const text = Buffer.from(args[8], 'utf8');
    this.sendToDevice(Buffer.concat([message, id, groupPrefix, group, text]));
    
    const err = (await response).err;
    if (err !== undefined) throw Error(err);

    device.guiIdToEvent[args[5]] = args[7];
};

Device.prototype.getToggleState = async function (device, args, clientId) {
    const password = this.getPassword(clientId);

    this._logger.log('get toggle state ' + this.mac_addr);
    const response = this.receiveFromDevice('gettogglestate');
    
    const id = Buffer.from(args[0], 'utf8');
    if (id.length > 255) throw new Error('id too long');

    const message = Buffer.alloc(9);
    message.write('W', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    
    this.sendToDevice(Buffer.concat([message, id]));
    
    const state = (await response).state;
    if (state === undefined) throw new Error('no toggleable with matching id');
    return state;
};

Device.prototype.getOrientation = async function (device, args, clientId) {
    const password = this.getPassword(clientId);

    this._logger.log('get orientation ' + this.mac_addr);
    const response = this.receiveFromDevice('orientation');
    const message = Buffer.alloc(9);
    message.write('O', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    this.sendToDevice(message);
    
    const res = await response;
    if (res.err) throw Error(res.err);
    return common.scale(res.vals, 180 / Math.PI);
};
Device.prototype.getCompassHeading = async function (device, args, clientId) {
    return (await this.getOrientation(device, args, clientId))[0];
};
Device.prototype.getCompassDirection = async function (device, args, clientId) {
    return common.closestScalar(await this.getCompassHeading(device, args, clientId), COMPASS_DIRECTIONS_8);
};
Device.prototype.getCompassCardinalDirection = async function (device, args, clientId) {
    return common.closestScalar(await this.getCompassHeading(device, args, clientId), COMPASS_DIRECTIONS_4);
};

Device.prototype.getAccelerometer = async function (device, args, clientId) {
    const password = this.getPassword(clientId);

    this._logger.log('get accelerometer ' + this.mac_addr);
    const response = this.receiveFromDevice('accelerometer');
    const message = Buffer.alloc(9);
    message.write('A', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    this.sendToDevice(message);
    
    const res = await response;
    if (res.err) throw Error(res.err);
    return res.vals;
};
Device.prototype.getFacingDirection = async function (device, args, clientId) {
    return common.closestVector(await this.getAccelerometer(device, args, clientId), DIRECTIONS_3D);
};

Device.prototype.getGravity = async function (device, args, clientId) {
    const password = this.getPassword(clientId);

    this._logger.log('get gravity ' + this.mac_addr);
    const response = this.receiveFromDevice('gravity');
    const message = Buffer.alloc(9);
    message.write('G', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    this.sendToDevice(message);
    
    const res = await response;
    if (res.err) throw Error(res.err);
    return res.vals;
};

Device.prototype.getLinearAcceleration = async function (device, args, clientId) {
    const password = this.getPassword(clientId);

    this._logger.log('get linear acceleration ' + this.mac_addr);
    const response = this.receiveFromDevice('linear');
    const message = Buffer.alloc(9);
    message.write('L', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    this.sendToDevice(message);
    
    const res = await response;
    if (res.err) throw Error(res.err);
    return res.vals;
};

Device.prototype.getGyroscope = async function (device, args, clientId) {
    const password = this.getPassword(clientId);

    this._logger.log('get gyroscope ' + this.mac_addr);
    const response = this.receiveFromDevice('gyroscope');
    const message = Buffer.alloc(9);
    message.write('Y', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    this.sendToDevice(message);
    
    const res = await response;
    if (res.err) throw Error(res.err);
    return common.scale(res.vals, 180 / Math.PI);
};
Device.prototype.getRotation = async function (device, args, clientId) {
    const password = this.getPassword(clientId);

    this._logger.log('get rotation ' + this.mac_addr);
    const response = this.receiveFromDevice('rotation');
    const message = Buffer.alloc(9);
    message.write('R', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    this.sendToDevice(message);

    const res = await response;
    if (res.err) throw Error(res.err);
    return res.vals;
};
Device.prototype.getGameRotation = async function (device, args, clientId) {
    const password = this.getPassword(clientId);

    this._logger.log('get game rotation ' + this.mac_addr);
    const response = this.receiveFromDevice('gamerotation');
    const message = Buffer.alloc(9);
    message.write('r', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    this.sendToDevice(message);
    
    const res = await response;
    if (res.err) throw Error(res.err);
    return res.vals;
};

Device.prototype.getMagneticFieldVector = async function (device, args, clientId) {
    const password = this.getPassword(clientId);
    
    this._logger.log('get mag field ' + this.mac_addr);
    const response = this.receiveFromDevice('magfield');
    const message = Buffer.alloc(9);
    message.write('M', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    this.sendToDevice(message);
    
    const res = await response;
    if (res.err) throw Error(res.err);
    return res.vals;
};

Device.prototype.getMicrophoneLevel = async function (device, args, clientId) {
    const password = this.getPassword(clientId);

    this._logger.log('get mic level ' + this.mac_addr);
    const response = this.receiveFromDevice('miclevel');
    const message = Buffer.alloc(9);
    message.write('m', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    this.sendToDevice(message);

    const res = await response;
    if (res.err !== undefined) throw Error(res.err);
    return res.vals[0];
};
Device.prototype.getProximity = async function (device, args, clientId) {
    const password = this.getPassword(clientId);

    this._logger.log('get proximity ' + this.mac_addr);
    const response = this.receiveFromDevice('proximity');
    const message = Buffer.alloc(9);
    message.write('P', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    this.sendToDevice(message);
    
    const res = await response;
    if (res.err !== undefined) throw Error(res.err);
    return res.vals[0];
};
Device.prototype.getStepCount = async function (device, args, clientId) {
    const password = this.getPassword(clientId);

    this._logger.log('get step count ' + this.mac_addr);
    const response = this.receiveFromDevice('stepcount');
    const message = Buffer.alloc(9);
    message.write('S', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    this.sendToDevice(message);

    const res = await response;
    if (res.err !== undefined) throw Error(res.err);
    return res.vals[0];
};
Device.prototype.getLightLevel = async function (device, args, clientId) {
    const password = this.getPassword(clientId);
    
    this._logger.log('get light level ' + this.mac_addr);
    const response = this.receiveFromDevice('lightlevel');
    const message = Buffer.alloc(9);
    message.write('l', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    this.sendToDevice(message);
    
    const res = await response;
    if (res.err !== undefined) throw Error(res.err);
    return res.vals[0];
};

Device.prototype._getLocationRaw = async function (device, args, clientId) {
    const password = this.getPassword(clientId);

    this._logger.log('get location ' + this.mac_addr);
    const response = this.receiveFromDevice('location');
    const message = Buffer.alloc(9);
    message.write('X', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    this.sendToDevice(message);
    return response;
};
Device.prototype.getLocation = async function (device, args, clientId) {
    const res = await this._getLocationRaw(device, args, clientId);
    if (res.err) throw Error(res.err);
    return res.vals.slice(0, 2);
};
Device.prototype.getBearing = async function (device, args, clientId) {
    const res = await await this._getLocationRaw(device, args, clientId);
    if (res.err) throw Error(res.err);
    return res.vals[2];
};
Device.prototype.getAltitude = async function (device, args, clientId) {
    const res = await await this._getLocationRaw(device, args, clientId);
    if (res.err) throw Error(res.err);
    return res.vals[3];
};

Device.prototype.commandToClient = function (command) {
    if (PHONE_IOT_MODE === 'security' || PHONE_IOT_MODE === 'both') {
        const mac_addr = this.mac_addr;
        this.sockets.forEach(socket => {
            const content = {
                device: mac_addr,
                command: command
            };
            socket.sendMessage('device command', content);
        });
    }
};

Device.prototype.sendToClient = function (msgType, content) {
    const myself = this;

    let fields = ['time', ...Object.keys(content)];
    content.device = this.mac_addr;
    content.time = this.timestamp;

    this._logger.log('event ' + msgType);

    if (this.callbacks[msgType]) {
        const callbacks = this.callbacks[msgType];
        delete this.callbacks[msgType];
        callbacks.forEach(function (callback) {
            callback(content);
        });
        callbacks.length = 0;
    }

    this.sockets.forEach(async socket => {
        await acl.ensureAuthorized(socket.username, myself.mac_addr); // should use deviceId instead of mac_addr

        if (PHONE_IOT_MODE === 'native' || PHONE_IOT_MODE === 'both') {
            socket.sendMessage(msgType, content);
        }

        if ((PHONE_IOT_MODE === 'security' && msgType !== 'set led') ||
            PHONE_IOT_MODE === 'both') {
            let text = msgType;
            for (let i = 0; i < fields.length; i++) {
                text += ' ' + content[fields[i]];
            }

            const encryptedContent = {
                device: myself.mac_addr,
                message: this._hasValidEncryptionSet() ? myself.encrypt(text.trim()) : text.trim()
            };
            socket.sendMessage('device message', encryptedContent);
        }
    });
};

Device.prototype._fireRawCustomEvent = function(id, content) {
    const event = this.guiIdToEvent[id];
    if (event === undefined) return;
    for (const listener in this.guiListeners) {
        const socket = this.guiListeners[listener];
        try {
            socket.sendMessage(event, content);
        }
        catch (ex) {
            this._logger.log(ex);
        }
    }
};

Device.prototype._sendVoidResult = function(name, message, failureString) {
    this.sendToClient(name, message.length === 11 ? {} : { err: failureString });
};
Device.prototype._sendControlResult = function(name, message) {
    let err = 'unknown error';
    if (message.length === 12) switch (message[11]) {
        case 0: err = undefined; break;
        case 1: err = 'too many controls'; break;
        case 2: err = 'item with id already existed'; break;
        case 3: err = 'control with id not found'; break;
    }
    this.sendToClient(name, { err });
};
Device.prototype._sendSensorResult = function(name, sensorName, message) {
    if (message.length === 11) this.sendToClient(name, {err: `${sensorName} is disabled or not supported`});
    else {
        const vals = [];
        let i = 11;
        for (; i + 8 <= message.length; i += 8) {
            vals.push(message.readDoubleBE(i));
        }
        if (i === message.length) this.sendToClient(name, {vals});
    }
};

// used for handling incoming message from the device
Device.prototype.onMessage = function (message) {
    if (message.length < 11) {
        this._logger.log('invalid message ' + this.ip4_addr + ':' + this.ip4_port + ' ' + message.toString('hex'));
        return;
    }

    const oldTimestamp = this.timestamp;
    this.timestamp = message.readUInt32LE(6);
    const command = message.toString('ascii', 10, 11);

    if (command === 'I') {
        if (this.timestamp < oldTimestamp) {
            this._logger.log('device was rebooted ' + this.mac_addr);
            this.resetSeqNum();
            this.setEncryptionKey([]);
            this.resetRates();
        }
    }
    else if (command === 'a') this._sendVoidResult('auth', message, 'failed to auth');
    else if (command === 'C') this._sendVoidResult('clearcontrols', message, 'failed to clear controls');
    else if (command === 'c') this._sendVoidResult('removecontrol', message, 'failed to remove control');
    else if (command === 'u') {
        const img = message.slice(11);
        this.sendToClient('getimage', img.length > 0 ? {img} : {});
    }
    else if (command === 'h') {
        const text = message.length >= 12 && message[11] === 0 ? message.toString('utf8', 12) : undefined;
        this.sendToClient('gettext', {text});
    }
    else if (command === 'H') this._sendControlResult('settext', message);
    else if (command === 'i') this._sendControlResult('setimage', message);
    else if (command === 'g') this._sendControlResult('addlabel', message);
    else if (command === 'B') this._sendControlResult('addbutton', message);
    else if (command === 'Z') this._sendControlResult('addcheckbox', message);
    else if (command === 'T') this._sendControlResult('addtextfield', message);
    else if (command === 'y') this._sendControlResult('addradiobutton', message);
    else if (command === 'U') this._sendControlResult('addimagedisplay', message);
    else if (command === 'b') {
        const id = message.toString('utf8', 11);
        this._fireRawCustomEvent(id, {id});
    }
    else if (command === 't') {
        if (message.length >= 12) {
            const idlen = message[11] & 0xff;
            if (message.length >= 12 + idlen) {
                const id = message.toString('utf8', 12, 12 + idlen);
                const text = message.toString('utf8', 12 + idlen);
                this._fireRawCustomEvent(id, {id, text});
            }
        }
    }
    else if (command === 'z') {
        if (message.length >= 12) {
            const state = message[11] !== 0;
            const id = message.toString('utf8', 12, message.length);
            this._fireRawCustomEvent(id, { id, state });
        }
    }
    else if (command === 'W') {
        let state = undefined;
        if (message.length === 12) switch (message[11]) {
            case 0: state = false; break;
            case 1: state = true; break;
        }
        this.sendToClient('gettogglestate', { state });
    }
    else if (command === 'O') this._sendSensorResult('orientation', 'orientation sensor', message);
    else if (command === 'R') this._sendSensorResult('rotation', 'rotation sensor', message);
    else if (command === 'X') this._sendSensorResult('location', 'location', message);
    else if (command === 'A') this._sendSensorResult('accelerometer', 'accelerometer', message);
    else if (command === 'G') this._sendSensorResult('gravity', 'gravity sensor', message);
    else if (command === 'L') this._sendSensorResult('linear', 'linear acceleration sensor', message);
    else if (command === 'Y') this._sendSensorResult('gyroscope', 'gyroscope', message);
    else if (command === 'r') this._sendSensorResult('gamerotation', 'game rotation sensor', message);
    else if (command === 'M') this._sendSensorResult('magfield', 'magnetic field sensor', message);
    else if (command === 'm') this._sendSensorResult('miclevel', 'microphone', message);
    else if (command === 'P') this._sendSensorResult('proximity', 'proximity sensor', message);
    else if (command === 'S') this._sendSensorResult('stepcount', 'step counter', message);
    else if (command === 'l') this._sendSensorResult('lightlevel', 'light sensor', message);
    else this._logger.log('unknown ' + this.ip4_addr + ':' + this.ip4_port + ' ' + message.toString('hex'));
};

// handle user commands to the device (through the 'send' rpc)
Device.prototype.onCommand = function(command) {
    const cases = [
        {
            regex: /^is alive$/,
            handler: () => {
                this.sendToClient('alive', {});
                return this.isAlive();
            }
        },
        {
            regex: /^set encryption ([^ ]+)(| -?\d+([ ,]-?\d+)*)$/, // name of the cipher
            handler: () => {
                const cipherName = RegExp.$1.toLowerCase();
                const key = RegExp.$2.split(/[, ]/);
                if (key[0] === '') key.splice(0, 1);
                return this.setEncryptionMethod(cipherName) && this.setEncryptionKey(key);
            }
        },
        { // deprecated
            regex: /^set key(| -?\d+([ ,]-?\d+)*)$/,
            handler: () => {
                const encryption = RegExp.$1.split(/[, ]/);
                if (encryption[0] === '') encryption.splice(0, 1);
                return this.setEncryptionKey(encryption.map(Number));
            }
        },
        {
            regex: /^set total rate (-?\d+)$/,
            handler: () => {
                this.setTotalRate(+RegExp.$1);
            }
        },
        {
            regex: /^set client rate (-?\d+)[, ](-?\d+)$/,
            handler: () => {
                this.setClientRate(+RegExp.$1, +RegExp.$2);
            }
        },
        {
            regex: /^reset seq$/,
            handler: () => {
                this.resetSeqNum();
            }
        },
        {
            regex: /^reset rates$/,
            handler: () => {
                this.resetRates();
            }
        },
    ];

    let matchingCase = cases.find(aCase => command.match(aCase.regex));
    if (!matchingCase) return false; // invalid command structure

    let rv = matchingCase.handler();
    if (rv === undefined) rv = true;
    return rv;
};

// determines whether encryption/decryption can be activated or not
Device.prototype._hasValidEncryptionSet = function () {
    let verdict = (this.encryptionKey && this.encryptionMethod && Array.isArray(this.encryptionKey) && this.encryptionKey.length !== 0);
    return verdict;
};

Device.prototype.encrypt = function (text) {
    if (!this._hasValidEncryptionSet()) {
        throw new Error('invalid encryption setup');
    }
    let output = this.encryptionMethod.encrypt(text, this.encryptionKey);
    this._logger.log('"' + text + '" encrypted to "' + output + '"');
    return output;
};

Device.prototype.decrypt = function (text) {
    if (!this._hasValidEncryptionSet()) {
        throw new Error('invalid encryption setup');
    }
    let output = this.encryptionMethod.decrypt(text, this.encryptionKey);
    this._logger.log('"' + text + '" decrypted to "' + output + '"');
    return output;
};

// disable encryption and decryption with minimal changes
Device.prototype.disableEncryption = function () {
    this.encryptionMethod = ciphers.plain;
};

Device.prototype.setEncryptionMethod = function (name) {
    if (!ciphers[name]) {
        this._logger.warn('invalid cipher name ' + name);
        return false;
    }
    this._logger.log('setting cipher to ' + name);

    this.encryptionMethod = ciphers[name];
    return true;
};

// WARN keys number?
Device.prototype.setEncryptionKey = function (keys) {
    if (!this.encryptionMethod) {
        this._logger.warn('setting the key without a cipher ' + keys);
        return false;
    } else if (keys instanceof Array) { // all the supported ciphers require an array of numbers
        keys = keys.map(num => parseInt(num));
        this.encryptionKey = keys;
        this._logger.log(this.mac_addr, 'encryption key set to', keys);
        return true;
    } else {
        this._logger.warn('invalid encryption key ' + keys);
        return false;
    }
};

Device.prototype.randomEncryption = function () {
    const keys = [];
    const blinks = [];
    for (let i = 0; i < 4; i++) {
        const a = Math.floor(Math.random() * 16);
        keys.push(a);
        blinks.push(a & 0x8 ? 2 : 1);
        blinks.push(a & 0x4 ? 2 : 1);
        blinks.push(a & 0x2 ? 2 : 1);
        blinks.push(a & 0x1 ? 2 : 1);
    }
    blinks.push(3);
    this.resetSeqNum();
    this.resetRates();
    this.setEncryptionKey(keys);
    this.playBlinks(blinks);
};

// resets encryption, sequencing, and rate limits
Device.prototype.resetDevice = function () {
    this._logger.log('resetting device');
    this.resetSeqNum();
    this.resetRates();
    this.resetEncryption();
    this.playBlinks([3]);
};

module.exports = Device;

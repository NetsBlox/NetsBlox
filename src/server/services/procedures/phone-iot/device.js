'use strict';
const getRPCLogger = require('../utils/logger');
const acl = require('../roboscape/accessControl');
const PHONE_IOT_MODE = process.env.PHONE_IOT_MODE || 'both';
const ciphers = require('../roboscape/ciphers');
const common = require('./common');

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
// J - get pos vector
// j - add joystick
// K - joystick event
// L - linear acceleration
// l - light level
// M - magnetic field
// m - microphone level
// N - add touchpad
// n - touchpad event
// O - orientation calculator
// P - proximity
// p - set sensor update periods
// Q - sensor packet
// R - rotation vector
// r - game rotation vector
// S - step counter
// T - add custom text field
// t - text field content
// U - add custom image box
// u - image box content
// V - is pressed
// v - image box updated
// W - get toggle state
// w - set toggle state
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

    this.sensorToListeners = {}; // Map<SensorID, Map<ClientID, (Socket, lastUpdate, period)>>

    this.controlUpdateTimestamps = {}; // Map<GUI ID, time index>
    this.sensorPacketTimestamp = -1; // timestamp of last sensor packet

    this.controlCount = 0; // counter used to generate unique custom control ids
};

Device.prototype.getPassword = function (clientId) {
    const pass = this.credentials[clientId];
    if (pass === undefined) throw Error('no login credentials set for this device');
    return pass;
};
Device.prototype.getNewId = function (opts) {
    return opts.id || `ctrl-${this.controlCount += 1}`;
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

// common function for all rpcs that start a request
Device.prototype.rpcHeader = function (name, clientId) {
    const password = this.getPassword(clientId); // do this first in case it fails
    this._logger.log(`calling ${name} ${this.mac_addr}`);
    const response = this.receiveFromDevice(name);
    return { response, password };
};
function parseId(id) {
    const res = Buffer.from(id, 'utf8');
    if (res.length > 255) throw Error('id too long');
    return res;
}
// if obj.err is defined, throws an error, otherwise returns obj
function throwIfErr(obj) {
    const err = obj.err;
    if (err !== undefined) throw Error(err);
    return obj;
}

Device.prototype.setSensorUpdatePeriods = async function (periods, clientId) {
    const { response, password } = this.rpcHeader('setsensorperiods', clientId);

    const message = Buffer.alloc(9 + 4 * periods.length);
    message.write('p', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    for (let i = 0; i < periods.length; ++i) message.writeInt32BE(periods[i], 9 + 4 * i);
    this.sendToDevice(message);

    throwIfErr(await response);
};

Device.prototype.authenticate = async function (device, args, clientId) {
    const { response, password } = this.rpcHeader('auth', clientId);

    const message = Buffer.alloc(9);
    message.write('a', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    this.sendToDevice(message);

    throwIfErr(await response);
};

Device.prototype.clearControls = async function (device, args, clientId) {
    const { response, password } = this.rpcHeader('clearcontrols', clientId);

    const message = Buffer.alloc(9);
    message.write('C', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    this.sendToDevice(message);

    throwIfErr(await response);

    this.controlCount = 0; // we can safely reset this to zero and reuse old ids
    this.controlUpdateTimestamps = {}; // discard all the old control timestamp data
};
Device.prototype.removeControl = async function (device, args, clientId) {
    const { response, password } = this.rpcHeader('removecontrol', clientId);
    const id = parseId(args[0]);

    const message = Buffer.alloc(9);
    message.write('c', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    this.sendToDevice(Buffer.concat([message, id]));

    throwIfErr(await response);

    delete this.controlUpdateTimestamps[args[0]]; // discard any timestamp data relating to this id
};
Device.prototype.addLabel = async function (device, args, clientId) {
    const { response, password } = this.rpcHeader('addlabel', clientId);
    const opts = args[3];
    const id = this.getNewId(opts);
    const idbuf = Buffer.from(id, 'utf8');

    const message = Buffer.alloc(28);
    message.write('g', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    message.writeFloatBE(args[0], 9);
    message.writeFloatBE(args[1], 13);
    message.writeInt32BE(opts.textColor, 17);
    message.writeFloatBE(opts.fontSize, 21);
    message[25] = opts.align;
    message[26] = opts.landscape ? 1 : 0;
    message[27] = idbuf.length;

    const text = Buffer.from(args[2], 'utf8');
    this.sendToDevice(Buffer.concat([message, idbuf, text]));
    
    throwIfErr(await response);

    return id;
};
Device.prototype.addButton = async function (device, args, clientId) {
    const { response, password } = this.rpcHeader('addbutton', clientId);
    const opts = args[5];
    const id = this.getNewId(opts);
    const idbuf = Buffer.from(id, 'utf8');

    const message = Buffer.alloc(40);
    message.write('B', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    message.writeFloatBE(args[0], 9);
    message.writeFloatBE(args[1], 13);
    message.writeFloatBE(args[2], 17);
    message.writeFloatBE(args[3], 21);
    message.writeInt32BE(opts.color, 25);
    message.writeInt32BE(opts.textColor, 29);
    message.writeFloatBE(opts.fontSize, 33);
    message[37] = opts.style;
    message[38] = opts.landscape ? 1 : 0;
    message[39] = idbuf.length;

    const text = Buffer.from(args[4], 'utf8');
    this.sendToDevice(Buffer.concat([message, idbuf, text]));
    
    throwIfErr(await response);

    device.guiIdToEvent[id] = opts.event;
    return id;
};
Device.prototype.addImageDisplay = async function (device, args, clientId) {
    const { response, password } = this.rpcHeader('addimagedisplay', clientId);
    const opts = args[4];
    const id = this.getNewId(opts);
    const idbuf = Buffer.from(id, 'utf8');

    const message = Buffer.alloc(28);
    message.write('U', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    message.writeFloatBE(args[0], 9);
    message.writeFloatBE(args[1], 13);
    message.writeFloatBE(args[2], 17);
    message.writeFloatBE(args[3], 21);
    message[25] = opts.readonly ? 1 : 0;
    message[26] = opts.landscape ? 1 : 0;
    message[27] = opts.fit;
    this.sendToDevice(Buffer.concat([message, idbuf]));
    
    throwIfErr(await response);

    device.guiIdToEvent[id] = opts.event;
    return id;
};
Device.prototype.addTextField = async function (device, args, clientId) {
    const { response, password } = this.rpcHeader('addtextfield', clientId);
    const opts = args[4];
    const id = this.getNewId(opts);
    const idbuf = Buffer.from(id, 'utf8');

    const message = Buffer.alloc(41);
    message.write('T', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    message.writeFloatBE(args[0], 9);
    message.writeFloatBE(args[1], 13);
    message.writeFloatBE(args[2], 17);
    message.writeFloatBE(args[3], 21);
    message.writeInt32BE(opts.color, 25);
    message.writeInt32BE(opts.textColor, 29);
    message.writeFloatBE(opts.fontSize, 33);
    message[37] = opts.align;
    message[38] = opts.readonly ? 1 : 0;
    message[39] = opts.landscape ? 1 : 0;
    message[40] = idbuf.length;

    const text = Buffer.from(opts.text, 'utf8');
    this.sendToDevice(Buffer.concat([message, idbuf, text]));
    
    throwIfErr(await response);

    device.guiIdToEvent[id] = opts.event;
    return id;
};
Device.prototype.addJoystick = async function (device, args, clientId) {
    const { response, password } = this.rpcHeader('addjoystick', clientId);
    const opts = args[3];
    const id = this.getNewId(opts);
    const idbuf = Buffer.from(id, 'utf8');

    const message = Buffer.alloc(26);
    message.write('j', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    message.writeFloatBE(args[0], 9);
    message.writeFloatBE(args[1], 13);
    message.writeFloatBE(args[2], 17);
    message.writeInt32BE(opts.color, 21);
    message[25] = opts.landscape ? 1 : 0;

    this.sendToDevice(Buffer.concat([message, idbuf]));
    
    throwIfErr(await response);

    device.guiIdToEvent[id] = opts.event;
    return id;
};
Device.prototype.addTouchpad = async function (device, args, clientId) {
    const { response, password } = this.rpcHeader('addtouchpad', clientId);
    const opts = args[4];
    const id = this.getNewId(opts);
    const idbuf = Buffer.from(id, 'utf8');

    const message = Buffer.alloc(31);
    message.write('N', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    message.writeFloatBE(args[0], 9);
    message.writeFloatBE(args[1], 13);
    message.writeFloatBE(args[2], 17);
    message.writeFloatBE(args[3], 21);
    message.writeInt32BE(opts.color, 25);
    message[29] = opts.style;
    message[30] = opts.landscape ? 1 : 0;

    this.sendToDevice(Buffer.concat([message, idbuf]));
    
    throwIfErr(await response);

    device.guiIdToEvent[id] = opts.event;
    return id;
};
Device.prototype.addToggle = async function (device, args, clientId) {
    const { response, password } = this.rpcHeader('addtoggle', clientId);
    const opts = args[3];
    const id = this.getNewId(opts);
    const idbuf = Buffer.from(id, 'utf8');

    const message = Buffer.alloc(34);
    message.write('Z', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    message.writeFloatBE(args[0], 9);
    message.writeFloatBE(args[1], 13);
    message.writeInt32BE(opts.color, 17);
    message.writeInt32BE(opts.textColor, 21);
    message.writeFloatBE(opts.fontSize, 25);
    message[29] = opts.checked ? 1 : 0;
    message[30] = opts.style;
    message[31] = opts.landscape ? 1 : 0;
    message[32] = opts.readonly ? 1 : 0;
    message[33] = idbuf.length;

    const text = Buffer.from(args[2], 'utf8');
    this.sendToDevice(Buffer.concat([message, idbuf, text]));
    
    throwIfErr(await response);

    device.guiIdToEvent[id] = opts.event;
    return id;
};
Device.prototype.addRadioButton = async function (device, args, clientId) {
    const { response, password } = this.rpcHeader('addradiobutton', clientId);
    const opts = args[3];
    const id = this.getNewId(opts);
    const idbuf = Buffer.from(id, 'utf8');

    const group = parseId(opts.group);
    const groupPrefix = Buffer.alloc(1);
    groupPrefix[0] = group.length;

    const message = Buffer.alloc(33);
    message.write('y', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    message.writeFloatBE(args[0], 9);
    message.writeFloatBE(args[1], 13);
    message.writeInt32BE(opts.color, 17);
    message.writeInt32BE(opts.textColor, 21);
    message.writeFloatBE(opts.fontSize, 25);
    message[29] = opts.checked ? 1 : 0;
    message[30] = opts.landscape ? 1 : 0;
    message[31] = opts.readonly ? 1 : 0;
    message[32] = idbuf.length;

    const text = Buffer.from(args[2], 'utf8');
    this.sendToDevice(Buffer.concat([message, idbuf, groupPrefix, group, text]));
    
    throwIfErr(await response);

    device.guiIdToEvent[id] = opts.event;
    return id;
};
Device.prototype.getImage = async function (device, args, clientId) {
    const { response, password } = this.rpcHeader('getimage', clientId);
    const id = parseId(args[0]);

    const message = Buffer.alloc(9);
    message.write('u', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    this.sendToDevice(Buffer.concat([message, id]));
    
    return throwIfErr(await response).img;
};
Device.prototype.setImage = async function (device, args, clientId) {
    const { response, password } = this.rpcHeader('setimage', clientId);
    const id = parseId(args[0]);

    const message = Buffer.alloc(10);
    message.write('i', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    message[9] = id.length;

    const img = await common.prepImageToSend(args[1]);
    this.sendToDevice(Buffer.concat([message, id, img]));
    
    throwIfErr(await response);
};
Device.prototype.setText = async function (device, args, clientId) {
    const { response, password } = this.rpcHeader('settext', clientId);
    const id = parseId(args[0]);

    const message = Buffer.alloc(10);
    message.write('H', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    message[9] = id.length;

    const text = Buffer.from(args[1], 'utf8');
    this.sendToDevice(Buffer.concat([message, id, text]));
    
    throwIfErr(await response);
};
Device.prototype.getText = async function (device, args, clientId) {
    const { response, password } = this.rpcHeader('gettext', clientId);
    const id = parseId(args[0]);

    const message = Buffer.alloc(9);
    message.write('h', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    this.sendToDevice(Buffer.concat([message, id]));
    
    return throwIfErr(await response).text;
};
Device.prototype.getPosition = async function (device, args, clientId) {
    const { response, password } = this.rpcHeader('getpos', clientId);
    const id = parseId(args[0]);

    const message = Buffer.alloc(9);
    message.write('J', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    this.sendToDevice(Buffer.concat([message, id]));
    
    return throwIfErr(await response).res;
};

Device.prototype.isPressed = async function (device, args, clientId) {
    const { response, password } = this.rpcHeader('isPressed', clientId);
    const id = parseId(args[0]);

    const message = Buffer.alloc(9);
    message.write('V', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    
    this.sendToDevice(Buffer.concat([message, id]));
    
    return throwIfErr(await response).state;
};

Device.prototype.getToggleState = async function (device, args, clientId) {
    const { response, password } = this.rpcHeader('getToggleState', clientId);
    const id = parseId(args[0]);

    const message = Buffer.alloc(9);
    message.write('W', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    
    this.sendToDevice(Buffer.concat([message, id]));
    
    return throwIfErr(await response).state;
};
Device.prototype.setToggleState = async function (device, args, clientId) {
    const { response, password } = this.rpcHeader('setToggleState', clientId);
    const id = parseId(args[0]);

    const message = Buffer.alloc(10);
    message.write('w', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    message[9] = args[1] ? 1 : 0;
    
    this.sendToDevice(Buffer.concat([message, id]));
    
    return throwIfErr(await response).state;
};

Device.prototype.getOrientation = async function (device, args, clientId) {
    const { response, password } = this.rpcHeader('orientation', clientId);

    const message = Buffer.alloc(9);
    message.write('O', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    this.sendToDevice(message);
    
    return common.scale(throwIfErr(await response).vals, 180 / Math.PI);
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
    const { response, password } = this.rpcHeader('accelerometer', clientId);

    const message = Buffer.alloc(9);
    message.write('A', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    this.sendToDevice(message);
    
    return throwIfErr(await response).vals;
};
Device.prototype.getFacingDirection = async function (device, args, clientId) {
    return common.closestVector(await this.getAccelerometer(device, args, clientId), DIRECTIONS_3D);
};

Device.prototype.getGravity = async function (device, args, clientId) {
    const { response, password } = this.rpcHeader('gravity', clientId);

    const message = Buffer.alloc(9);
    message.write('G', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    this.sendToDevice(message);
    
    return throwIfErr(await response).vals;
};

Device.prototype.getLinearAcceleration = async function (device, args, clientId) {
    const { response, password } = this.rpcHeader('linear', clientId);

    const message = Buffer.alloc(9);
    message.write('L', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    this.sendToDevice(message);
    
    return throwIfErr(await response).vals;
};

Device.prototype.getGyroscope = async function (device, args, clientId) {
    const { response, password } = this.rpcHeader('gyroscope', clientId);

    const message = Buffer.alloc(9);
    message.write('Y', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    this.sendToDevice(message);
    
    return common.scale(throwIfErr(await response).vals, 180 / Math.PI);
};
Device.prototype.getRotation = async function (device, args, clientId) {
    const { response, password } = this.rpcHeader('rotation', clientId);

    const message = Buffer.alloc(9);
    message.write('R', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    this.sendToDevice(message);

    return throwIfErr(await response).vals;
};
Device.prototype.getGameRotation = async function (device, args, clientId) {
    const { response, password } = this.rpcHeader('gamerotation', clientId);

    const message = Buffer.alloc(9);
    message.write('r', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    this.sendToDevice(message);
    
    return throwIfErr(await response).vals;
};

Device.prototype.getMagneticField = async function (device, args, clientId) {
    const { response, password } = this.rpcHeader('magfield', clientId);

    const message = Buffer.alloc(9);
    message.write('M', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    this.sendToDevice(message);
    
    return throwIfErr(await response).vals;
};

Device.prototype.getMicrophoneLevel = async function (device, args, clientId) {
    const { response, password } = this.rpcHeader('miclevel', clientId);

    const message = Buffer.alloc(9);
    message.write('m', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    this.sendToDevice(message);

    return throwIfErr(await response).vals[0];
};
Device.prototype.getProximity = async function (device, args, clientId) {
    const { response, password } = this.rpcHeader('proximity', clientId);

    const message = Buffer.alloc(9);
    message.write('P', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    this.sendToDevice(message);
    
    return throwIfErr(await response).vals[0];
};
Device.prototype.getStepCount = async function (device, args, clientId) {
    const { response, password } = this.rpcHeader('stepcount', clientId);

    const message = Buffer.alloc(9);
    message.write('S', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    this.sendToDevice(message);

    return throwIfErr(await response).vals[0];
};
Device.prototype.getLightLevel = async function (device, args, clientId) {
    const { response, password } = this.rpcHeader('lightlevel', clientId);

    const message = Buffer.alloc(9);
    message.write('l', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    this.sendToDevice(message);
    
    return throwIfErr(await response).vals[0];
};

Device.prototype._getLocationRaw = async function (device, args, clientId) {
    const { response, password } = this.rpcHeader('location', clientId);

    const message = Buffer.alloc(9);
    message.write('X', 0, 1);
    message.writeBigInt64BE(common.gracefulPasswordParse(password), 1);
    this.sendToDevice(message);
    return response;
};
Device.prototype.getLocation = async function (device, args, clientId) {
    return throwIfErr(await this._getLocationRaw(device, args, clientId)).vals.slice(0, 2);
};
Device.prototype.getBearing = async function (device, args, clientId) {
    return throwIfErr(await this._getLocationRaw(device, args, clientId)).vals[2];
};
Device.prototype.getAltitude = async function (device, args, clientId) {
    return throwIfErr(await this._getLocationRaw(device, args, clientId)).vals[3];
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

const ORDERED_SENSOR_TYPES = [
    'accelerometer',
    'gravity',
    'linearAcceleration',
    'gyroscope',
    'rotation',
    'gameRotation',
    'magneticField',
    'microphoneLevel',
    'proximity',
    'stepCount',
    'lightLevel',
    'location',
    'orientation',
];
Device.prototype._parseSensorPacket = function (message, pos, stop) {
    const res = {};
    for (const sensor of ORDERED_SENSOR_TYPES) {
        if (pos >= stop) {
            this._logger.log('invalid sensor packet - missing items');
            return {};
        }
        const len = message[pos++];
        if (len === 0) continue;
        if (pos + len * 8 > stop) {
            this._logger.log('invalid sensor packet - missing data');
            return {};
        }

        const vals = [];
        for (let i = 0; i < len; ++i, pos += 8) {
            vals.push(message.readDoubleBE(pos));
        }

        const packed = common.SENSOR_PACKERS[sensor](vals);
        packed['device'] = this.mac_addr;
        res[sensor] = packed;
    }
    return res;
};
Device.prototype._sendSensorPacketUpdates = function (packet) {
    const now = new Date();
    for (const sensor in packet) {
        const content = packet[sensor];
        const listeners = this.sensorToListeners[sensor] || {};
        for (const listener in listeners) {
            const [socket, lastUpdate, period] = listeners[listener];
            if (now - lastUpdate < period) continue;
            listeners[listener][1] = now; // update lastUpdate

            try {
                socket.sendMessage(sensor, content);
            }
            catch (ex) {
                this._logger.log(ex);
            }
        }
    }
};
Device.prototype._sendBoolStateResult = function (name, meta, message) {
    let state = undefined;
    if (message.length === 12) switch (message[11]) {
        case 0: state = false; break;
        case 1: state = true; break;
    }
    this.sendToClient(name, state !== undefined ? { state } : { err: `no ${meta} with matching id` });
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
        if (message.length > 11) {
            const rsp = Buffer.alloc(1);
            rsp.write('I', 0, 1);
            this.sendToDevice(rsp);
        }
    }
    else if (command === 'Q') {
        if (message.length >= 15) {
            const timestamp = message.readInt32BE(11);
            if (timestamp > this.sensorPacketTimestamp) {
                this.sensorPacketTimestamp = timestamp;
                const packet = this._parseSensorPacket(message, 15, message.length);
                this._sendSensorPacketUpdates(packet);
            }
        }
    }
    else if (command === 'a') this._sendVoidResult('auth', message, 'failed to auth');
    else if (command === 'p') this._sendVoidResult('setsensorperiods', message, 'failed to set sensor periods');
    else if (command === 'C') this._sendVoidResult('clearcontrols', message, 'failed to clear controls');
    else if (command === 'c') this._sendVoidResult('removecontrol', message, 'failed to remove control');
    else if (command === 'u') {
        const img = message.slice(11);
        this.sendToClient('getimage', img.length > 0 ? {img} : { err: 'no image display with matching id' });
    }
    else if (command === 'h') {
        const text = message.length >= 12 && message[11] === 0 ? message.toString('utf8', 12) : undefined;
        this.sendToClient('gettext', text !== undefined ? {text} : { err: 'no text with matching id' });
    }
    else if (command === 'J') {
        if (message.length === 11) this.sendToClient('getpos', { err: 'no positional control with matching id' });
        else if (message.length === 12) this.sendToClient('getpos', { res: 'control does not have a current position' }); // not an error, just no location
        else if (message.length === 20) this.sendToClient('getpos', { res: [message.readFloatBE(12), message.readFloatBE(16)] });
    }
    else if (command === 'H') this._sendControlResult('settext', message);
    else if (command === 'i') this._sendControlResult('setimage', message);
    else if (command === 'g') this._sendControlResult('addlabel', message);
    else if (command === 'B') this._sendControlResult('addbutton', message);
    else if (command === 'Z') this._sendControlResult('addtoggle', message);
    else if (command === 'j') this._sendControlResult('addjoystick', message);
    else if (command === 'N') this._sendControlResult('addtouchpad', message);
    else if (command === 'T') this._sendControlResult('addtextfield', message);
    else if (command === 'w') this._sendControlResult('setToggleState', message);
    else if (command === 'y') this._sendControlResult('addradiobutton', message);
    else if (command === 'U') this._sendControlResult('addimagedisplay', message);
    else if (command === 'b') {
        const id = message.toString('utf8', 11);
        this._fireRawCustomEvent(id, {id});
    }
    else if (command === 'K') {
        if (message.length >= 23) {
            const id = message.toString('utf8', 23);
            const time = message.readInt32BE(11); // check the time index so we don't send events out of order
            if (!(time < this.controlUpdateTimestamps[id])) { // this way we include if it's undefined (in which case we set it)
                this.controlUpdateTimestamps[id] = time;
                this._fireRawCustomEvent(id, { id, x: message.readFloatBE(15), y: message.readFloatBE(19) });
            }
        }
    }
    else if (command === 'n') {
        if (message.length >= 24) {
            const id = message.toString('utf8', 24);
            const time = message.readInt32BE(11); // check the time index so we don't send events out of order
            if (!(time < this.controlUpdateTimestamps[id])) { // this way we include if it's undefined (in which case we set it)
                this.controlUpdateTimestamps[id] = time;

                let tag = undefined;
                switch (message[15]) {
                    case 0: tag = 'down'; break;
                    case 1: tag = 'move'; break;
                    case 2: tag = 'up'; break;
                }
                if (tag) this._fireRawCustomEvent(id, { id, x: message.readFloatBE(16), y: message.readFloatBE(20), tag });
            }
        }
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
    else if (command === 'W') this._sendBoolStateResult('getToggleState', 'toggleable', message);
    else if (command === 'V') this._sendBoolStateResult('isPressed', 'pressable', message);
    else if (command === 'r') this._sendSensorResult('gamerotation', 'game rotation sensor', message);
    else if (command === 'L') this._sendSensorResult('linear', 'linear acceleration sensor', message);
    else if (command === 'M') this._sendSensorResult('magfield', 'magnetic field sensor', message);
    else if (command === 'O') this._sendSensorResult('orientation', 'orientation sensor', message);
    else if (command === 'A') this._sendSensorResult('accelerometer', 'accelerometer', message);
    else if (command === 'P') this._sendSensorResult('proximity', 'proximity sensor', message);
    else if (command === 'R') this._sendSensorResult('rotation', 'rotation sensor', message);
    else if (command === 'l') this._sendSensorResult('lightlevel', 'light sensor', message);
    else if (command === 'S') this._sendSensorResult('stepcount', 'step counter', message);
    else if (command === 'G') this._sendSensorResult('gravity', 'gravity sensor', message);
    else if (command === 'm') this._sendSensorResult('miclevel', 'microphone', message);
    else if (command === 'Y') this._sendSensorResult('gyroscope', 'gyroscope', message);
    else if (command === 'X') this._sendSensorResult('location', 'location', message);
    else this._logger.log('unknown command from ' + this.ip4_addr + ':' + this.ip4_port + ' - content bin: ' + message.toString('hex'));
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
        throw Error('invalid encryption setup');
    }
    let output = this.encryptionMethod.encrypt(text, this.encryptionKey);
    this._logger.log('"' + text + '" encrypted to "' + output + '"');
    return output;
};

Device.prototype.decrypt = function (text) {
    if (!this._hasValidEncryptionSet()) {
        throw Error('invalid encryption setup');
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
    for (let i = 0; i < 4; i++) {
        const a = Math.floor(Math.random() * 16);
        keys.push(a);
    }
    this.resetSeqNum();
    this.resetRates();
    this.setEncryptionKey(keys);
};

// resets encryption, sequencing, and rate limits
Device.prototype.resetDevice = function () {
    this._logger.log('resetting device');
    this.resetSeqNum();
    this.resetRates();
    this.resetEncryption();
};

module.exports = Device;

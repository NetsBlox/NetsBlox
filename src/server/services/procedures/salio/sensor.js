'use strict';
const getRPCLogger = require('../utils/logger');
const acl = require('../roboscape/accessControl');
const SALIO_MODE = process.env.SALIO_MODE || 'both';
const ciphers = require('../roboscape/ciphers');
const common = require('./common');
const { definedOrThrow } = require('./common');

// occupied protocols:
// A - accelerometer
// a - authenticate
// B - add custom button control
// b - button press event
// C - clear custom controls
// D - image snapshot
// G - gravity
// g - add custom label control
// I - heartbeat
// L - linear acceleration
// l - light level
// M - magnetic field
// O - orientation calculator
// P - proximity
// R - rotation vector
// r - game rotation vector
// S - step counter
// X - location
// Y - gyroscope
// y - add custom radiobutton control
// Z - add custom checkbox control
// z - checkbox press event

// these might be better defined as an attribute on the sensor
const FORGET_TIME = 120; // forgetting a sensor in seconds
const RESPONSE_TIMEOUT = 5000; // ms (well over worst case)

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
    [Math.PI / 2, 'E'],
    [-Math.PI / 2, 'W'],
    [Math.PI, 'S'],
    [-Math.PI, 'S'],
];
const COMPASS_DIRECTIONS_8 = [
    [0, 'N'],
    [Math.PI / 4, 'NE'],
    [-Math.PI / 4, 'NW'],
    [Math.PI / 2, 'E'],
    [-Math.PI / 2, 'W'],
    [3 * Math.PI / 4, 'SE'],
    [-3 * Math.PI / 4, 'SW'],
    [Math.PI, 'S'],
    [-Math.PI, 'S'],
];

const MAX_ACTION_LISTENERS = 10000;

var Sensor = function (mac_addr, ip4_addr, ip4_port, aServer) {
    this.id = mac_addr;
    this.mac_addr = mac_addr;
    this.ip4_addr = ip4_addr;
    this.ip4_port = ip4_port;
    this.heartbeats = 0;
    this.timestamp = -1; // time of last message in sensor time
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
    this._logger = getRPCLogger(`salio:${mac_addr}`);
    this.server = aServer; // a handle to the udp server for communication with the sensor

    this.customEvents = {}; // Map<ID, Map<Name, Map<ClientID, Socket>>>
};

Sensor.prototype.setTotalRate = function (rate) {
    this._logger.log('set total rate ' + this.mac_addr + ' ' + rate);
    this.totalRate = Math.max(rate, 0);
};

Sensor.prototype.setClientRate = function (rate, penalty) {
    this._logger.log('set client rate ' + this.mac_addr + ' ' + rate + ' ' + penalty);
    this.clientRate = Math.max(rate, 0);
    this.clientPenalty = Math.min(Math.max(penalty, 0), 60);
};

Sensor.prototype.resetRates = function () {
    this._logger.log('reset rate limits');
    this.totalRate = 0;
    this.clientRate = 0;
    this.clientPenalty = 0;
    this.clientCounts = {};
};

// resets the encryption
// for backward compat sets it to caesar cipher with key [0]
Sensor.prototype.resetEncryption = function () {
    this._logger.log('resetting encryption');
    // null would make more sense but keeping backward compatibility here
    this.encryptionMethod = ciphers.caesar;
    this.encryptionKey = [0];
};

Sensor.prototype.resetSeqNum = function () {
    this._logger.log('resetting seq numbering');
    this.setSeqNum(-1);
};

Sensor.prototype.updateAddress = function (ip4_addr, ip4_port) {
    this.ip4_addr = ip4_addr;
    this.ip4_port = ip4_port;
    this.heartbeats = 0;
};

Sensor.prototype.setSeqNum = function (seqNum) {
    this.lastSeqNum = seqNum;
};

Sensor.prototype.accepts = function (clientId, seqNum) {
    if (this.lastSeqNum >= 0 && (seqNum <= this.lastSeqNum ||
            seqNum > this.lastSeqNum + 100)) {
        return false;
    }

    var client = this.clientCounts[clientId];
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

Sensor.prototype.heartbeat = function () {
    this.totalCount = 0;
    for (var id in this.clientCounts) {
        var client = this.clientCounts[id];
        client.count = 0;
        if (client.penalty > 1) {
            client.count = 0;
            client.penalty -= 1;
        } else {
            delete this.clientCounts[id];
        }
    }

    this.heartbeats += 1;
    if (this.heartbeats >= FORGET_TIME) {
        return false;
    }
    return true;
};

Sensor.prototype.isAlive = function () {
    return this.heartbeats <= 2;
};

Sensor.prototype.isMostlyAlive = function () {
    return this.heartbeats <= FORGET_TIME;
};

Sensor.prototype.addClientSocket = function (socket) {
    const {clientId} = socket;
    var i = this.sockets.findIndex(s => s.clientId === clientId);
    if (i < 0) {
        this._logger.log('register ' + clientId + ' ' + this.mac_addr);
        this.sockets.push(socket);
        return true;
    }
    return false;
};

Sensor.prototype.removeClientSocket = function (socket) {
    const {clientId} = socket;
    var i = this.sockets.findIndex(s => s.clientId === clientId);
    if (i >= 0) {
        this._logger.log('unregister ' + clientId + ' ' + this.mac_addr);
        this.sockets.splice(i, 1);
        return true;
    }
    return false;
};

Sensor.prototype.sendToSensor = function (message) {
    this.server.send(message, this.ip4_port, this.ip4_addr, function (err) {
        if (err) {
            this._logger.log('send error ' + err);
        }
    });
};

Sensor.prototype.receiveFromSensor = function (msgType, timeout) {
    if (!this.callbacks[msgType]) {
        this.callbacks[msgType] = [];
    }
    var callbacks = this.callbacks[msgType];

    return new Promise(function (resolve) {
        callbacks.push(resolve);
        setTimeout(function () {
            var i = callbacks.indexOf(resolve);
            if (i >= 0) {
                callbacks.splice(i, 1);
            }
            resolve(false);
        }, timeout || RESPONSE_TIMEOUT);
    });
};

Sensor.prototype.authenticate = async function (sensor, args) {
    this._logger.log('authenticate ' + this.mac_addr);
    const response = this.receiveFromSensor('auth');
    const message = Buffer.alloc(9);
    message.write('a', 0, 1);
    message.writeBigInt64BE(common.gracefullPasswordParse(args[0]), 1);
    this.sendToSensor(message);
    return definedOrThrow((await response).res, 'sensor offline or failed to auth');
};

Sensor.prototype.clearControls = async function (sensor, args) {
    this._logger.log('clear controls ' + this.mac_addr);
    const response = this.receiveFromSensor('clearcontrols');
    const message = Buffer.alloc(9);
    message.write('C', 0, 1);
    message.writeBigInt64BE(common.gracefullPasswordParse(args[0]), 1);
    this.sendToSensor(message);
    return definedOrThrow((await response).res, 'failed clear or failed auth');
};
Sensor.prototype.addButton = async function (sensor, args) {
    this._logger.log('add button ' + this.mac_addr);
    const response = this.receiveFromSensor('addbutton');
    const message = Buffer.alloc(37);
    message.write('B', 0, 1);
    message.writeBigInt64BE(common.gracefullPasswordParse(args[0]), 1);
    message.writeFloatBE(args[1], 9);
    message.writeFloatBE(args[2], 13);
    message.writeFloatBE(args[3], 17);
    message.writeFloatBE(args[4], 21);
    message.writeInt32BE(args[5], 25);
    message.writeInt32BE(args[6], 29);
    message.writeInt32BE(args[7], 33);
    const text = Buffer.from(args[8], 'utf8');
    this.sendToSensor(Buffer.concat([message, text]));
    
    const err = (await response).err;
    if (err === undefined) throw new Error('failed add button or failed auth');
    if (err !== null) throw new Error(err);
    return true;
};
Sensor.prototype.addLabel = async function (sensor, args) {
    this._logger.log('add label ' + this.mac_addr);
    const response = this.receiveFromSensor('addlabel');
    const message = Buffer.alloc(21);
    message.write('g', 0, 1);
    message.writeBigInt64BE(common.gracefullPasswordParse(args[0]), 1);
    message.writeFloatBE(args[1], 9);
    message.writeFloatBE(args[2], 13);
    message.writeInt32BE(args[3], 17);
    const text = Buffer.from(args[4], 'utf8');
    this.sendToSensor(Buffer.concat([message, text]));
    
    const err = (await response).err;
    if (err === undefined) throw new Error('failed add button or failed auth');
    if (err !== null) throw new Error(err);
    return true;
};
Sensor.prototype.addCheckbox = async function (sensor, args) {
    this._logger.log('add checkbox ' + this.mac_addr);
    const response = this.receiveFromSensor('addcheckbox');
    const message = Buffer.alloc(30);
    message.write('Z', 0, 1);
    message.writeBigInt64BE(common.gracefullPasswordParse(args[0]), 1);
    message.writeFloatBE(args[1], 9);
    message.writeFloatBE(args[2], 13);
    message.writeInt32BE(args[3], 17);
    message.writeInt32BE(args[4], 21);
    message[25] = args[5] ? 1 : 0;
    message.writeInt32BE(args[6], 26);
    const text = Buffer.from(args[7], 'utf8');
    this.sendToSensor(Buffer.concat([message, text]));
    
    const err = (await response).err;
    if (err === undefined) throw new Error('failed add button or failed auth');
    if (err !== null) throw new Error(err);
    return true;
};
Sensor.prototype.addRadioButton = async function (sensor, args) {
    this._logger.log('add radio button ' + this.mac_addr);
    const response = this.receiveFromSensor('addradiobutton');
    const message = Buffer.alloc(34);
    message.write('y', 0, 1);
    message.writeBigInt64BE(common.gracefullPasswordParse(args[0]), 1);
    message.writeFloatBE(args[1], 9);
    message.writeFloatBE(args[2], 13);
    message.writeInt32BE(args[3], 17);
    message.writeInt32BE(args[4], 21);
    message[25] = args[5] ? 1 : 0;
    message.writeInt32BE(args[6], 26);
    message.writeInt32BE(args[7], 30);
    const text = Buffer.from(args[8], 'utf8');
    this.sendToSensor(Buffer.concat([message, text]));
    
    const err = (await response).err;
    if (err === undefined) throw new Error('failed add radio button or failed auth');
    if (err !== null) throw new Error(err);
    return true;
};

Sensor.prototype.getOrientation = async function (sensor, args) {
    this._logger.log('get orientation ' + this.mac_addr);
    const response = this.receiveFromSensor('orientation');
    const message = Buffer.alloc(9);
    message.write('O', 0, 1);
    message.writeBigInt64BE(common.gracefullPasswordParse(args[0]), 1);
    this.sendToSensor(message);
    const res = await response;
    return common.definedArrOrThrow([res.azimuth, res.pitch, res.roll], 'orientation sensor not enabled or failed to auth');
};
Sensor.prototype.getCompassHeading = async function (sensor, args) {
    return (await this.getOrientation(sensor, args))[0];
};
Sensor.prototype.getCompassHeadingDegrees = async function (sensor, args) {
    return await this.getCompassHeading(sensor, args) * 180 / Math.PI;
};
Sensor.prototype.getCompassDirection = async function (sensor, args) {
    return common.closestScalar(await this.getCompassHeading(sensor, args), COMPASS_DIRECTIONS_8);
};
Sensor.prototype.getCompassCardinalDirection = async function (sensor, args) {
    return common.closestScalar(await this.getCompassHeading(sensor, args), COMPASS_DIRECTIONS_4);
};

Sensor.prototype.getAccelerometer = async function (sensor, args) {
    this._logger.log('get accelerometer ' + this.mac_addr);
    const response = this.receiveFromSensor('accelerometer');
    const message = Buffer.alloc(9);
    message.write('A', 0, 1);
    message.writeBigInt64BE(common.gracefullPasswordParse(args[0]), 1);
    this.sendToSensor(message);
    const res = await response;
    return common.definedArrOrThrow([res.x, res.y, res.z], 'accelerometer not enabled or failed to auth');
};
Sensor.prototype.getAccelerometerNormalized = async function (sensor, args) {
    return common.normalize(await this.getAccelerometer(sensor, args));  
};
Sensor.prototype.getFacingDirection = async function (sensor, args) {
    return common.closestVector(await this.getAccelerometer(sensor, args), DIRECTIONS_3D);
};

Sensor.prototype.getGravity = async function (sensor, args) {
    this._logger.log('get gravity ' + this.mac_addr);
    const response = this.receiveFromSensor('gravity');
    const message = Buffer.alloc(9);
    message.write('G', 0, 1);
    message.writeBigInt64BE(common.gracefullPasswordParse(args[0]), 1);
    this.sendToSensor(message);
    const res = await response;
    return common.definedArrOrThrow([res.x, res.y, res.z], 'gravity sensor not enabled or failed to auth');
};
Sensor.prototype.getGravityNormalized = async function (sensor, args) {
    return common.normalize(await this.getGravity(sensor, args));  
};

Sensor.prototype.getLinearAcceleration = async function (sensor, args) {
    this._logger.log('get linear acceleration ' + this.mac_addr);
    const response = this.receiveFromSensor('linear');
    const message = Buffer.alloc(9);
    message.write('L', 0, 1);
    message.writeBigInt64BE(common.gracefullPasswordParse(args[0]), 1);
    this.sendToSensor(message);
    const res = await response;
    return common.definedArrOrThrow([res.x, res.y, res.z], 'linear acceleration sensor not enabled or failed to auth');
};
Sensor.prototype.getLinearAccelerationNormalized = async function (sensor, args) {
    return common.normalize(await this.getLinearAcceleration(sensor, args));  
};

Sensor.prototype.getGyroscope = async function (sensor, args) {
    this._logger.log('get gyroscope ' + this.mac_addr);
    const response = this.receiveFromSensor('gyroscope');
    const message = Buffer.alloc(9);
    message.write('Y', 0, 1);
    message.writeBigInt64BE(common.gracefullPasswordParse(args[0]), 1);
    this.sendToSensor(message);
    const res = await response;
    return common.definedArrOrThrow([res.x, res.y, res.z], 'gyroscope not enabled or failed to auth');
};
Sensor.prototype.getRotation = async function (sensor, args) {
    this._logger.log('get rotation ' + this.mac_addr);
    const response = this.receiveFromSensor('rotation');
    const message = Buffer.alloc(9);
    message.write('R', 0, 1);
    message.writeBigInt64BE(common.gracefullPasswordParse(args[0]), 1);
    this.sendToSensor(message);
    const res = await response;
    return common.definedArrOrThrow([res.x, res.y, res.z, res.w], 'rotation sensor not enabled or failed to auth');
};
Sensor.prototype.getGameRotation = async function (sensor, args) {
    this._logger.log('get game rotation ' + this.mac_addr);
    const response = this.receiveFromSensor('gamerotation');
    const message = Buffer.alloc(9);
    message.write('r', 0, 1);
    message.writeBigInt64BE(common.gracefullPasswordParse(args[0]), 1);
    this.sendToSensor(message);
    const res = await response;
    return common.definedArrOrThrow([res.x, res.y, res.z], 'game rotation sensor not enabled or failed to auth');
};

Sensor.prototype.getMagneticFieldVector = async function (sensor, args) {
    this._logger.log('get mag field ' + this.mac_addr);
    const response = this.receiveFromSensor('magfield');
    const message = Buffer.alloc(9);
    message.write('M', 0, 1);
    message.writeBigInt64BE(common.gracefullPasswordParse(args[0]), 1);
    this.sendToSensor(message);
    const res = await response;
    return common.definedArrOrThrow([res.x, res.y, res.z], 'magnetic field sensor not enabled or failed to auth');
};
Sensor.prototype.getMagneticFieldVectorNormalized = async function (sensor, args) {
    return common.normalize(await this.getMagneticFieldVector(sensor, args));  
};

Sensor.prototype.getProximity = async function (sensor, args) {
    this._logger.log('get proximity ' + this.mac_addr);
    const response = this.receiveFromSensor('proximity');
    const message = Buffer.alloc(9);
    message.write('P', 0, 1);
    message.writeBigInt64BE(common.gracefullPasswordParse(args[0]), 1);
    this.sendToSensor(message);
    return common.definedOrThrow((await response).proximity, 'proximity sensor not enabled or failed to auth');
};
Sensor.prototype.getStepCount = async function (sensor, args) {
    this._logger.log('get step count ' + this.mac_addr);
    const response = this.receiveFromSensor('stepcount');
    const message = Buffer.alloc(9);
    message.write('S', 0, 1);
    message.writeBigInt64BE(common.gracefullPasswordParse(args[0]), 1);
    this.sendToSensor(message);
    return common.definedOrThrow((await response).count, 'step counter not enabled or failed to auth');
};
Sensor.prototype.getLightLevel = async function (sensor, args) {
    this._logger.log('get light level ' + this.mac_addr);
    const response = this.receiveFromSensor('lightlevel');
    const message = Buffer.alloc(9);
    message.write('l', 0, 1);
    message.writeBigInt64BE(common.gracefullPasswordParse(args[0]), 1);
    this.sendToSensor(message);
    return common.definedOrThrow((await response).level, 'light sensor not enabled or failed to auth');
};

Sensor.prototype.getLocation = async function (sensor, args) {
    this._logger.log('get location ' + this.mac_addr);
    const response = this.receiveFromSensor('location');
    const message = Buffer.alloc(9);
    message.write('X', 0, 1);
    message.writeBigInt64BE(common.gracefullPasswordParse(args[0]), 1);
    this.sendToSensor(message);
    const res = await response;
    return common.definedArrOrThrow([res.lat, res.long], 'location not enabled or failed to auth');
};

Sensor.prototype.commandToClient = function (command) {
    if (SALIO_MODE === 'security' || SALIO_MODE === 'both') {
        var mac_addr = this.mac_addr;
        this.sockets.forEach(socket => {
            const content = {
                sensor: mac_addr,
                command: command
            };
            socket.sendMessage('sensor command', content);
        });
    }
};

Sensor.prototype.sendToClient = function (msgType, content) {
    var myself = this;

    let fields = ['time', ...Object.keys(content)];
    content.sensor = this.mac_addr;
    content.time = this.timestamp;

    if (msgType !== 'set led') {
        this._logger.log('event ' + msgType + ' ' + JSON.stringify(content));
    }

    if (this.callbacks[msgType]) {
        var callbacks = this.callbacks[msgType];
        delete this.callbacks[msgType];
        callbacks.forEach(function (callback) {
            callback(content);
        });
        callbacks.length = 0;
    }

    this.sockets.forEach(async socket => {
        await acl.ensureAuthorized(socket.username, myself.mac_addr); // should use sensorId instead of mac_addr

        if (SALIO_MODE === 'native' || SALIO_MODE === 'both') {
            socket.sendMessage(msgType, content);
        }

        if ((SALIO_MODE === 'security' && msgType !== 'set led') ||
            SALIO_MODE === 'both') {
            var text = msgType;
            for (var i = 0; i < fields.length; i++) {
                text += ' ' + content[fields[i]];
            }

            const encryptedContent = {
                sensor: myself.mac_addr,
                message: this._hasValidEncryptionSet() ? myself.encrypt(text.trim()) : text.trim()
            };
            socket.sendMessage('sensor message', encryptedContent);
        }
    });
};

Sensor.prototype._fireRawCustomEvent = function(id, content) {
    const customEvent = this.customEvents[id];
    if (customEvent !== undefined) {
        for (const name in customEvent) {
            const listeners = customEvent[name];
            for (const clientID in listeners) {
                const socket = listeners[clientID];
                try {
                    socket.sendMessage(name, content);
                }
                catch (ex) {
                    this._logger.log(ex);
                }
            }
        }
    }
};

// used for handling incoming message from the sensor
Sensor.prototype.onMessage = function (message) {
    if (message.length < 11) {
        this._logger.log('invalid message ' + this.ip4_addr + ':' + this.ip4_port +
            ' ' + message.toString('hex'));
        return;
    }

    var oldTimestamp = this.timestamp;
    this.timestamp = message.readUInt32LE(6);
    var command = message.toString('ascii', 10, 11);
    var state;

    if (command === 'I' && message.length === 11) {
        if (this.timestamp < oldTimestamp) {
            this._logger.log('sensor was rebooted ' + this.mac_addr);
            this.resetSeqNum();
            this.setEncryptionKey([]);
            this.resetRates();
        }
    }
    else if (command === 'P' && message.length === 12) {
        state = message.readUInt8(11) == 0;
        if (SALIO_MODE === 'native' || SALIO_MODE === 'both') {
            this.sendToClient('button', {
                pressed: state
            });
        }
        if (SALIO_MODE === 'security' || SALIO_MODE === 'both') {
            if (state) {
                this.buttonDownTime = new Date().getTime();
                setTimeout(function (sensor, pressed) {
                    if (sensor.buttonDownTime === pressed) {
                        sensor.resetSensor();
                    }
                }, 1000, this, this.buttonDownTime);
            } else {
                if (new Date().getTime() - this.buttonDownTime < 1000) {
                    this.randomEncryption();
                }
                this.buttonDownTime = 0;
            }
        }
    }
    else if (command === 'a') {
        this.sendToClient('auth', message.length === 11 ? { res: true } : {});
    }
    else if (command === 'C') {
        this.sendToClient('clearcontrols', message.length === 11 ? { res: true } : {});
    }
    else if (command === 'g') {
        let err = undefined;
        if (message.length === 12) switch (message[11]) {
            case 0: err = null; break;
            case 1: err = 'too many controls'; break;
            default: err = 'unknown error'; break;
        }
        this.sendToClient('addlabel', { err });
    }
    else if (command === 'B') {
        let err = undefined;
        if (message.length === 12) switch (message[11]) {
            case 0: err = null; break;
            case 1: err = 'too many controls'; break;
            default: err = 'unknown error'; break;
        }
        this.sendToClient('addbutton', { err });
    }
    else if (command === 'b' && message.length === 15) {
        const id = message.readUInt32BE(11);
        this._fireRawCustomEvent(id, {id});
    }
    else if (command === 'Z') {
        let err = undefined;
        if (message.length === 12) switch (message[11]) {
            case 0: err = null; break;
            case 1: err = 'too many controls'; break;
            default: err = 'unknown error'; break;
        }
        this.sendToClient('addcheckbox', { err });
    }
    else if (command === 'y') {
        let err = undefined;
        if (message.length === 12) switch (message[11]) {
            case 0: err = null; break;
            case 1: err = 'too many controls'; break;
            default: err = 'unknown error'; break;
        }
        this.sendToClient('addradiobutton', { err });
    }
    else if (command === 'z' && message.length === 16) {
        const id = message.readUInt32BE(11);
        const state = message[15] !== 0;
        this._fireRawCustomEvent(id, { id, state });
    }
    else if (command === 'O') {
        this.sendToClient('orientation', message.length === 23 ? {
            azimuth: message.readFloatBE(11),
            pitch: message.readFloatBE(15),
            roll: message.readFloatBE(19),
        } : {});
    }
    else if (command === 'A') {
        this.sendToClient('accelerometer', message.length === 23 ? {
            x: message.readFloatBE(11),
            y: message.readFloatBE(15),
            z: message.readFloatBE(19),
        } : {});
    }
    else if (command === 'G') {
        this.sendToClient('gravity', message.length === 23 ? {
            x: message.readFloatBE(11),
            y: message.readFloatBE(15),
            z: message.readFloatBE(19),
        } : {});
    }
    else if (command === 'L') {
        this.sendToClient('linear', message.length === 23 ? {
            x: message.readFloatBE(11),
            y: message.readFloatBE(15),
            z: message.readFloatBE(19),
        } : {});
    }
    else if (command === 'Y') {
        this.sendToClient('gyroscope', message.length === 23 ? {
            x: message.readFloatBE(11),
            y: message.readFloatBE(15),
            z: message.readFloatBE(19),
        } : {});
    }
    else if (command === 'R') {
        this.sendToClient('rotation', message.length === 27 ? {
            x: message.readFloatBE(11),
            y: message.readFloatBE(15),
            z: message.readFloatBE(19),
            w: message.readFloatBE(23),
        } : {});
    }
    else if (command === 'r') {
        this.sendToClient('gamerotation', message.length === 23 ? {
            x: message.readFloatBE(11),
            y: message.readFloatBE(15),
            z: message.readFloatBE(19),
        } : {});
    }
    else if (command === 'M') {
        this.sendToClient('magfield', message.length === 23 ? {
            x: message.readFloatBE(11),
            y: message.readFloatBE(15),
            z: message.readFloatBE(19),
        } : {});
    }
    else if (command === 'X') {
        this.sendToClient('location', message.length === 19 ? {
            lat: message.readFloatBE(11),
            long: message.readFloatBE(15),
        } : {});
    }
    else if (command === 'P') {
        this.sendToClient('proximity', message.length === 15 ? {
            proximity: message.readFloatBE(11),
        } : {});
    }
    else if (command === 'S') {
        this.sendToClient('stepcount', message.length === 15 ? {
            count: message.readFloatBE(11),
        } : {});
    }
    else if (command === 'l') {
        this.sendToClient('lightlevel', message.length === 15 ? {
            level: message.readFloatBE(11),
        } : {});
    }
    else {
        this._logger.log('unknown ' + this.ip4_addr + ':' + this.ip4_port +
            ' ' + message.toString('hex'));
    }
};

// handle user commands to the sensor (through the 'send' rpc)
Sensor.prototype.onCommand = function(command) {
    const cases = [
        {
            regex: /^is alive$/,
            handler: () => {
                this.sendToClient('alive', {});
                return this.isAlive();
            }
        },
        {
            regex: /^authenticate$/,
            handler: () => {
                return this.authenticate();
            }
        },
        {
            regex: /^clear controls$/,
            handler: () => {
                return this.clearControls();
            }
        },
        {
            regex: /^add button$/,
            handler: () => {
                return this.addButton();
            }
        },
        {
            regex: /^add checkbox$/,
            handler: () => {
                return this.addCheckbox();
            }
        },
        {
            regex: /^add radio button$/,
            handler: () => {
                return this.addRadioButton();
            }
        },
        {
            regex: /^add label$/,
            handler: () => {
                return this.addLabel();
            }
        },
        {
            regex: /^get orientation$/,
            handler: () => {
                return this.getOrientation();
            }
        },
        {
            regex: /^get compass heading$/,
            handler: () => {
                return this.getCompassHeading();
            }
        },
        {
            regex: /^get compass heading degrees$/,
            handler: () => {
                return this.getCompassHeadingDegrees();
            }
        },
        {
            regex: /^get compass direction$/,
            handler: () => {
                return this.getCompassDirection();
            }
        },
        {
            regex: /^get compass cardinal direction$/,
            handler: () => {
                return this.getCompassCardinalDirection();
            }
        },
        {
            regex: /^get accelerometer$/,
            handler: () => {
                return this.getAccelerometer();
            }
        },
        {
            regex: /^get accelerometer normalized$/,
            handler: () => {
                return this.getAccelerometerNormalized();
            }
        },
        {
            regex: /^get facing direction$/,
            handler: () => {
                return this.getFacingDirection();
            }
        },
        {
            regex: /^get gravity$/,
            handler: () => {
                return this.getGravity();
            }
        },
        {
            regex: /^get gravity normalized$/,
            handler: () => {
                return this.getGravityNormalized();
            }
        },
        {
            regex: /^get linear acceleration$/,
            handler: () => {
                return this.getLinearAcceleration();
            }
        },
        {
            regex: /^get linear acceleration normalized$/,
            handler: () => {
                return this.getLinearAccelerationNormalized();
            }
        },
        {
            regex: /^get gyroscope$/,
            handler: () => {
                return this.getGyroscope();
            }
        },
        {
            regex: /^get rotation$/,
            handler: () => {
                return this.getRotation();
            }
        },
        {
            regex: /^get game rotation$/,
            handler: () => {
                return this.getGameRotation();
            }
        },
        {
            regex: /^get magnetic field vector$/,
            handler: () => {
                return this.getMagneticFieldVector();
            }
        },
        {
            regex: /^get magnetic field vector normalized$/,
            handler: () => {
                return this.getMagneticFieldVectorNormalized();
            }
        },
        {
            regex: /^get location$/,
            handler: () => {
                return this.getLocation();
            }
        },
        {
            regex: /^get proximity$/,
            handler: () => {
                return this.getProximity();
            }
        },
        {
            regex: /^get step count$/,
            handler: () => {
                return this.getStepCount();
            }
        },
        {
            regex: /^get light level$/,
            handler: () => {
                return this.getLightLevel();
            }
        },
        {
            regex: /^set encryption ([^ ]+)(| -?\d+([ ,]-?\d+)*)$/, // name of the cipher
            handler: () => {
                let cipherName = RegExp.$1.toLowerCase();
                var key = RegExp.$2.split(/[, ]/);
                if (key[0] === '') {
                    key.splice(0, 1);
                }
                return this.setEncryptionMethod(cipherName) && this.setEncryptionKey(key);
            }
        },
        { // deprecated
            regex: /^set key(| -?\d+([ ,]-?\d+)*)$/,
            handler: () => {
                var encryption = RegExp.$1.split(/[, ]/);
                if (encryption[0] === '') {
                    encryption.splice(0, 1);
                }
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
Sensor.prototype._hasValidEncryptionSet = function () {
    let verdict = (this.encryptionKey && this.encryptionMethod && Array.isArray(this.encryptionKey) && this.encryptionKey.length !== 0);
    return verdict;
};

Sensor.prototype.encrypt = function (text) {
    if (!this._hasValidEncryptionSet()) {
        throw new Error('invalid encryption setup');
    }
    let output = this.encryptionMethod.encrypt(text, this.encryptionKey);
    this._logger.log('"' + text + '" encrypted to "' + output + '"');
    return output;
};

Sensor.prototype.decrypt = function (text) {
    if (!this._hasValidEncryptionSet()) {
        throw new Error('invalid encryption setup');
    }
    let output = this.encryptionMethod.decrypt(text, this.encryptionKey);
    this._logger.log('"' + text + '" decrypted to "' + output + '"');
    return output;
};

// disable encryption and decryption with minimal changes
Sensor.prototype.disableEncryption = function () {
    this.encryptionMethod = ciphers.plain;
};

Sensor.prototype.setEncryptionMethod = function (name) {
    if (!ciphers[name]) {
        this._logger.warn('invalid cipher name ' + name);
        return false;
    }
    this._logger.log('setting cipher to ' + name);

    this.encryptionMethod = ciphers[name];
    return true;
};

// WARN keys number?
Sensor.prototype.setEncryptionKey = function (keys) {
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

Sensor.prototype.randomEncryption = function () {
    var keys = [],
        blinks = [];
    for (var i = 0; i < 4; i++) {
        var a = Math.floor(Math.random() * 16);
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
Sensor.prototype.resetSensor = function () {
    this._logger.log('resetting sensor');
    this.resetSeqNum();
    this.resetRates();
    this.resetEncryption();
    this.playBlinks([3]);
};

module.exports = Sensor;

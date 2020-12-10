'use strict';
const getRPCLogger = require('../utils/logger');
const acl = require('../roboscape/accessControl');
const SALIO_MODE = process.env.SALIO_MODE || 'both';
const ciphers = require('../roboscape/ciphers');

// these might be better defined as an attribute on the sensor
const FORGET_TIME = 120; // forgetting a sensor in seconds
const RESPONSE_TIMEOUT = 500; // ms

const DIRECTIONS = [
    [[0, 0, 1], 'up'],
    [[0, 0, -1], 'down'],
    [[0, 1, 0], 'vertical'],
    [[0, -1, 0], 'upside down'],
    [[1, 0, 0], 'left'],
    [[-1, 0, 0], 'right'],  
];

function dotProduct(a, b) {
    let total = 0;
    for (var i = 0; i < a.length; ++i) {
        total += a[i] * b[i];
    }
    return total;
}
function magnitude(a) {
    return Math.sqrt(dotProduct(a, a));
}
function scale(a, f) {
    return a.map(x => x * f);
}
function normalize(a) {
    return scale(a, 1.0 / magnitude(a));
}
function angle(a, b) {
    return Math.acos(dotProduct(a, b) / (magnitude(a) * magnitude(b)));
}

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

Sensor.prototype.getAccelerometer = async function () {
    this._logger.log('get accelerometer ' + this.mac_addr);
    const response = this.receiveFromSensor('accelerometer');
    const message = Buffer.alloc(1);
    message.write('A', 0, 1);
    this.sendToSensor(message);
    const res = await response;
    return [res.x, res.y, res.z];
};
Sensor.prototype.getAccelerometerNormalized = async function () {
    return normalize(await this.getAccelerometer());  
};
Sensor.prototype.getFacingDirection = async function () {
    const v = await this.getAccelerometer();
    const best = [Infinity, undefined];
    for (const dir of DIRECTIONS) {
        const t = angle(v, dir[0]);
        if (t < best[0]) {
            best[0] = t;
            best[1] = dir[1];
        }
    }
    return best[1];
};

Sensor.prototype.getGravity = async function () {
    this._logger.log('get gravity ' + this.mac_addr);
    const response = this.receiveFromSensor('gravity');
    const message = Buffer.alloc(1);
    message.write('G', 0, 1);
    this.sendToSensor(message);
    const res = await response;
    return [res.x, res.y, res.z];
};
Sensor.prototype.getGravityNormalized = async function () {
    return normalize(await this.getGravity());  
};

Sensor.prototype.getLinearAcceleration = async function () {
    this._logger.log('get linear acceleration ' + this.mac_addr);
    const response = this.receiveFromSensor('linear');
    const message = Buffer.alloc(1);
    message.write('L', 0, 1);
    this.sendToSensor(message);
    const res = await response;
    return [res.x, res.y, res.z];
};
Sensor.prototype.getLinearAccelerationNormalized = async function () {
    return normalize(await this.getLinearAcceleration());  
};

Sensor.prototype.getGyroscope = async function () {
    this._logger.log('get gyroscope ' + this.mac_addr);
    const response = this.receiveFromSensor('gyroscope');
    const message = Buffer.alloc(1);
    message.write('Y', 0, 1);
    this.sendToSensor(message);
    const res = await response;
    return [res.x, res.y, res.z];
};
Sensor.prototype.getRotation = async function () {
    this._logger.log('get rotation ' + this.mac_addr);
    const response = this.receiveFromSensor('rotation');
    const message = Buffer.alloc(1);
    message.write('R', 0, 1);
    this.sendToSensor(message);
    const res = await response;
    return [res.x, res.y, res.z, res.w];
};
Sensor.prototype.getGameRotation = async function () {
    this._logger.log('get game rotation ' + this.mac_addr);
    const response = this.receiveFromSensor('gamerotation');
    const message = Buffer.alloc(1);
    message.write('r', 0, 1);
    this.sendToSensor(message);
    const res = await response;
    return [res.x, res.y, res.z];
};

Sensor.prototype.getMagneticFieldVector = async function () {
    this._logger.log('get mag field ' + this.mac_addr);
    const response = this.receiveFromSensor('magfield');
    const message = Buffer.alloc(1);
    message.write('M', 0, 1);
    this.sendToSensor(message);
    const res = await response;
    return [res.x, res.y, res.z];
};
Sensor.prototype.getMagneticFieldVectorNormalized = async function () {
    return normalize(await this.getMagneticFieldVector());  
};

Sensor.prototype.getProximity = async function () {
    this._logger.log('get proximity ' + this.mac_addr);
    const response = this.receiveFromSensor('proximity');
    const message = Buffer.alloc(1);
    message.write('P', 0, 1);
    this.sendToSensor(message);
    return (await response).proximity;
};
Sensor.prototype.getStepCount = async function () {
    this._logger.log('get step count ' + this.mac_addr);
    const response = this.receiveFromSensor('stepcount');
    const message = Buffer.alloc(1);
    message.write('S', 0, 1);
    this.sendToSensor(message);
    return (await response).count;
};
Sensor.prototype.getLightLevel = async function () {
    this._logger.log('get light level ' + this.mac_addr);
    const response = this.receiveFromSensor('lightlevel');
    const message = Buffer.alloc(1);
    message.write('l', 0, 1);
    this.sendToSensor(message);
    return (await response).level;
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
    else if (command === 'W' && message.length === 12) {
        state = message.readUInt8(11);
        this.sendToClient('whiskers', {
            left: (state & 0x2) == 0,
            right: (state & 0x1) == 0
        });
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
    else if (command === 'A' && message.length === 23) {
        this.sendToClient('accelerometer', {
            x: message.readFloatBE(11),
            y: message.readFloatBE(15),
            z: message.readFloatBE(19),
        });
    }
    else if (command === 'G' && message.length === 23) {
        this.sendToClient('gravity', {
            x: message.readFloatBE(11),
            y: message.readFloatBE(15),
            z: message.readFloatBE(19),
        });
    }
    else if (command === 'L' && message.length === 23) {
        this.sendToClient('linear', {
            x: message.readFloatBE(11),
            y: message.readFloatBE(15),
            z: message.readFloatBE(19),
        });
    }
    else if (command === 'Y' && message.length === 23) {
        this.sendToClient('gyroscope', {
            x: message.readFloatBE(11),
            y: message.readFloatBE(15),
            z: message.readFloatBE(19),
        });
    }
    else if (command === 'R' && message.length === 27) {
        this.sendToClient('rotation', {
            x: message.readFloatBE(11),
            y: message.readFloatBE(15),
            z: message.readFloatBE(19),
            w: message.readFloatBE(23),
        });
    }
    else if (command === 'r' && message.length === 23) {
        this.sendToClient('gamerotation', {
            x: message.readFloatBE(11),
            y: message.readFloatBE(15),
            z: message.readFloatBE(19),
        });
    }
    else if (command === 'M' && message.length === 23) {
        this.sendToClient('magfield', {
            x: message.readFloatBE(11),
            y: message.readFloatBE(15),
            z: message.readFloatBE(19),
        });
    }
    else if (command === 'P' && message.length === 15) {
        this.sendToClient('proximity', {
            proximity: message.readFloatBE(11),
        });
    }
    else if (command === 'S' && message.length === 15) {
        this.sendToClient('stepcount', {
            count: message.readFloatBE(11),
        });
    }
    else if (command === 'l' && message.length === 15) {
        this.sendToClient('lightlevel', {
            level: message.readFloatBE(11),
        });
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

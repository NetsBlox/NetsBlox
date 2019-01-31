'use strict';
const getRPCLogger = require('../utils/logger');
const NetworkTopology = require('../../../network-topology');
const ROBOSCAPE_MODE = process.env.ROBOSCAPE_MODE || 'both';

// these might be better defined as an attribute on the robot
const FORGET_TIME = 120; // forgetting a robot in seconds
const RESPONSE_TIMEOUT = 200; // waiting for response in milliseconds

var Robot = function (mac_addr, ip4_addr, ip4_port, aServer) {
    this.mac_addr = mac_addr;
    this.ip4_addr = ip4_addr;
    this.ip4_port = ip4_port;
    this.heartbeats = 0;
    this.timestamp = -1; // time of last message in robot time
    this.sockets = []; // uuids of sockets of registered clients
    this.callbacks = {}; // callbacks keyed by msgType
    this.encryption = []; // encryption key
    this.buttonDownTime = 0; // last time button was pressed
    // rate control
    this.totalCount = 0; // in messages per second
    this.totalRate = 0; // in messages per second
    this.clientRate = 0; // in messages per second
    this.clientPenalty = 0; // in seconds
    this.clientCounts = {};
    this.lastSeqNum = -1; // initially disabled
    this._logger = getRPCLogger(`roboscape:${mac_addr}`);
    this.server = aServer; // a handle to the udp server for communication with the robot
};

Robot.prototype.setTotalRate = function (rate) {
    this._logger.log('set total rate ' + this.mac_addr + ' ' + rate);
    this.totalRate = Math.max(rate, 0);
};

Robot.prototype.setClientRate = function (rate, penalty) {
    this._logger.log('set client rate ' + this.mac_addr + ' ' + rate + ' ' + penalty);
    this.clientRate = Math.max(rate, 0);
    this.clientPenalty = Math.min(Math.max(penalty, 0), 60);
};

Robot.prototype.resetRates = function () {
    this._logger.log('reset rate limits');
    this.totalRate = 0;
    this.clientRate = 0;
    this.clientPenalty = 0;
    this.clientCounts = {};
};

Robot.prototype.updateAddress = function (ip4_addr, ip4_port) {
    this.ip4_addr = ip4_addr;
    this.ip4_port = ip4_port;
    this.heartbeats = 0;
};

Robot.prototype.setSeqNum = function (seqNum) {
    this.lastSeqNum = seqNum;
};

Robot.prototype.accepts = function (clientId, seqNum) {
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

Robot.prototype.heartbeat = function () {
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

Robot.prototype.isAlive = function () {
    return this.heartbeats <= 2;
};

Robot.prototype.isMostlyAlive = function () {
    return this.heartbeats <= FORGET_TIME;
};

Robot.prototype.addClientSocket = function (uuid) {
    var i = this.sockets.indexOf(uuid);
    if (i < 0) {
        this._logger.log('register ' + uuid + ' ' + this.mac_addr);
        this.sockets.push(uuid);
        return true;
    }
    return false;
};

Robot.prototype.removeClientSocket = function (uuid) {
    var i = this.sockets.indexOf(uuid);
    if (i >= 0) {
        this._logger.log('unregister ' + uuid + ' ' + this.mac_addr);
        this.sockets.splice(i, 1);
        return true;
    }
    return false;
};

Robot.prototype.sendToRobot = function (message) {
    this.server.send(message, this.ip4_port, this.ip4_addr, function (err) {
        if (err) {
            this._logger.log('send error ' + err);
        }
    });
};

Robot.prototype.receiveFromRobot = function (msgType, timeout) {
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

Robot.prototype.setSpeed = function (left, right) {
    left = Math.max(Math.min(+left, 128), -128);
    right = Math.max(Math.min(+right, 128), -128);

    this._logger.log('set speed ' + this.mac_addr + ' ' + left + ' ' + right);
    var message = Buffer.alloc(5);
    message.write('S', 0, 1);
    message.writeInt16LE(left, 1);
    message.writeInt16LE(right, 3);
    this.sendToRobot(message);
};

Robot.prototype.setLed = function (led, cmd) {
    if (!('' + cmd).startsWith('_')) {
        this._logger.log('set led ' + this.mac_addr + ' ' + led + ' ' + cmd);
    }

    led = Math.min(Math.max(+led, 0), 1);
    if (cmd === false || cmd === 'false' ||
        cmd === 'off' || cmd === '_off' || +cmd === 0) {
        cmd = 0;
    } else if (cmd === true || cmd === 'true' ||
        cmd === 'on' || cmd === '_on' || +cmd === 1) {
        cmd = 1;
    } else {
        cmd = 2;
    }

    var message = Buffer.alloc(3);
    message.write('L', 0, 1);
    message.writeUInt8(led, 1);
    message.writeUInt8(cmd, 2);
    this.sendToRobot(message);
};

Robot.prototype.beep = function (msec, tone) {
    msec = Math.min(Math.max(+msec, 0), 1000);
    tone = Math.min(Math.max(+tone, 0), 20000);

    this._logger.log('set beep ' + this.mac_addr + ' ' + msec + ' ' + tone);
    var message = Buffer.alloc(5);
    message.write('B', 0, 1);
    message.writeUInt16LE(msec, 1);
    message.writeUInt16LE(tone, 3);
    this.sendToRobot(message);
};

Robot.prototype.infraLight = function (msec, pwr) {
    msec = Math.min(Math.max(+msec, 0), 1000);
    pwr = Math.round(2.55 * (100 - Math.min(Math.max(+pwr, 0), 100)));

    this._logger.log('infra light ' + this.mac_addr + ' ' + msec);
    var message = Buffer.alloc(4);
    message.write('G', 0, 1);
    message.writeUInt16LE(msec, 1);
    message.writeUInt8(pwr, 3);
    this.sendToRobot(message);
};

Robot.prototype.getRange = function () {
    this._logger.log('get range ' + this.mac_addr);
    var promise = this.receiveFromRobot('range');
    var message = Buffer.alloc(1);
    message.write('R', 0, 1);
    this.sendToRobot(message);
    return promise;
};

Robot.prototype.getTicks = function () {
    this._logger.log('get ticks ' + this.mac_addr);
    var promise = this.receiveFromRobot('ticks');
    var message = Buffer.alloc(1);
    message.write('T', 0, 1);
    this.sendToRobot(message);
    return promise;
};

Robot.prototype.drive = function (left, right) {
    left = Math.max(Math.min(+left, 64), -64);
    right = Math.max(Math.min(+right, 64), -64);

    this._logger.log('drive ' + this.mac_addr + ' ' + left + ' ' + right);
    var message = Buffer.alloc(5);
    message.write('D', 0, 1);
    message.writeInt16LE(left, 1);
    message.writeInt16LE(right, 3);
    this.sendToRobot(message);
};

Robot.prototype.commandToClient = function (command) {
    if (ROBOSCAPE_MODE === 'security' || ROBOSCAPE_MODE === 'both') {
        var mac_addr = this.mac_addr;
        this.sockets.forEach(function (uuid) {
            var socket = NetworkTopology.getSocket(uuid);
            if (socket) {
                const content = {
                    robot: mac_addr,
                    command: command
                };
                socket.sendMessage('robot command', content);
            } else {
                this._logger.log('socket not found for ' + uuid);
            }
        });
    }
};

Robot.prototype.sendToClient = function (msgType, content, fields) {
    var myself = this;

    content.robot = this.mac_addr;
    content.time = this.timestamp; // TODO auto add time field to the messages

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

    this.sockets.forEach(function (uuid) {
        var socket = NetworkTopology.getSocket(uuid);
        if (socket) {
            if (ROBOSCAPE_MODE === 'native' || ROBOSCAPE_MODE === 'both') {
                socket.sendMessage(msgType, content);
            }

            if ((ROBOSCAPE_MODE === 'security' && msgType !== 'set led') ||
                ROBOSCAPE_MODE === 'both') {
                var text = msgType;
                for (var i = 0; i < fields.length; i++) {
                    text += ' ' + content[fields[i]];
                }

                const encryptedContent = {
                    robot: myself.mac_addr,
                    message: myself.encrypt(text.trim())
                };
                socket.sendMessage('robot message', encryptedContent);
            }
        } else {
            this._logger.log('socket not found for ' + uuid);
        }
    });
};

// used for handling incoming message from the robot
Robot.prototype.onMessage = function (message) {
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
            this._logger.log('robot was rebooted ' + this.mac_addr);
            this.setSeqNum(-1);
            this.setEncryption([]);
            this.resetRates();
        }
    } else if (command === 'B' && message.length === 15) {
        this.sendToClient('beep', {
            msec: message.readInt16LE(11),
            tone: message.readInt16LE(13),
        }, ['time', 'msec', 'tone']);
    } else if (command === 'S' && message.length === 15) {
        this.sendToClient('speed', {
            left: message.readInt16LE(11),
            right: message.readInt16LE(13),
        }, ['time', 'left', 'right']);
    } else if (command === 'W' && message.length === 12) {
        state = message.readUInt8(11);
        this.sendToClient('whiskers', {
            left: (state & 0x2) == 0,
            right: (state & 0x1) == 0
        }, ['time', 'left', 'right']);
    } else if (command === 'P' && message.length === 12) {
        state = message.readUInt8(11) == 0;
        if (ROBOSCAPE_MODE === 'native' || ROBOSCAPE_MODE === 'both') {
            this.sendToClient('button', {
                pressed: state
            }, ['time', 'pressed']);
        }
        if (ROBOSCAPE_MODE === 'security' || ROBOSCAPE_MODE === 'both') {
            if (state) {
                this.buttonDownTime = new Date().getTime();
                setTimeout(function (robot, pressed) {
                    if (robot.buttonDownTime === pressed) {
                        robot.resetEncryption();
                    }
                }, 1000, this, this.buttonDownTime);
            } else {
                if (new Date().getTime() - this.buttonDownTime < 1000) {
                    this.randomEncryption();
                }
                this.buttonDownTime = 0;
            }
        }
    } else if (command === 'R' && message.length === 13) {
        this.sendToClient('range', {
            range: message.readInt16LE(11),
        }, ['time', 'range']);
    } else if (command === 'T' && message.length === 19) {
        this.sendToClient('ticks', {
            left: message.readInt32LE(11),
            right: message.readInt32LE(15),
        }, ['time', 'left', 'right']);
    } else if (command === 'D' && message.length === 15) {
        this.sendToClient('drive', {
            left: message.readInt16LE(11),
            right: message.readInt16LE(13),
        }, ['time', 'left', 'right']);
    } else if (command === 'L' && message.length === 13) {
        this.sendToClient('set led', {
            led: message.readUInt8(11),
            command: message.readUInt8(12)
        }, ['time', 'led', 'command']);
    } else if (command === 'F' && message.length === 12) {
        state = message.readUInt8(11);
        this.sendToClient('infra event', {
            left: (state & 0x2) == 0,
            right: (state & 0x1) == 0
        }, ['time', 'left', 'right']);
    } else if (command === 'G' && message.length === 14) {
        this.sendToClient('infra light', {
            msec: message.readInt16LE(11),
            pwr: Math.round(100 - message.readUInt8(13) / 2.55)
        }, ['time', 'msec', 'pwr']);
    } else {
        this._logger.log('unknown ' + this.ip4_addr + ':' + this.ip4_port +
            ' ' + message.toString('hex'));
    }
};

// handle user commands to the robot (through the 'send' rpc)
Robot.prototype.onCommand = function(command, seqNum) {
    const cases = [
        {
            regex: /^is alive$/,
            handler: () => {
                this.setSeqNum(seqNum);
                this.sendToClient('alive', {}, ['time']);
                return this.isAlive();
            }
        },
        {
            regex: /^beep (-?\d+)[, ](-?\d+)$/,
            handler: () => {
                this.setSeqNum(seqNum);
                this.beep(+RegExp.$1, +RegExp.$2);
                return true;
            }
        },
        {
            regex: /^set speed (-?\d+)[, ](-?\d+)$/,
            handler: () => {
                this.setSeqNum(seqNum);
                this.setSpeed(+RegExp.$1, +RegExp.$2);
                return true;
            }
        },
        {
            regex: /^drive (-?\d+)[, ](-?\d+)$/,
            handler: () => {
                this.setSeqNum(seqNum);
                this.drive(+RegExp.$1, +RegExp.$2);
                return true;
            }
        },
        {
            regex: /^get range$/,
            handler: () => {
                this.setSeqNum(seqNum);
                return this.getRange().then(function (value) {
                    return value && value.range;
                });
            }
        },
        {
            regex: /^get ticks$/,
            handler: () => {
                this.setSeqNum(seqNum);
                return this.getTicks().then(function (value) {
                    return value && [value.left, value.right];
                });
            }
        },
        {
            regex: /^set key(| -?\d+([ ,]-?\d+)*)$/,
            handler: () => {
                this.setSeqNum(seqNum);
                var encryption = RegExp.$1.split(/[, ]/);
                if (encryption[0] === '') {
                    encryption.splice(0, 1);
                }
                return this.setEncryption(encryption.map(Number));
            }
        },
        {
            regex: /^set total rate (-?\d+)$/,
            handler: () => {
                this.setSeqNum(seqNum);
                this.setTotalRate(+RegExp.$1);
                return true;
            }
        },
        {
            regex: /^set client rate (-?\d+)[, ](-?\d+)$/,
            handler: () => {
                this.setSeqNum(seqNum);
                this.setClientRate(+RegExp.$1, +RegExp.$2);
                return true;
            }
        },
        {
            regex: /^set led (-?\d+)[, ](-?\d+)$/,
            handler: () => {
                this.setSeqNum(seqNum);
                this.setLed(+RegExp.$1, +RegExp.$2);
                return true;
            }
        },
        {
            regex: /^infra light (-?\d+)[, ](-?\d+)$/,
            handler: () => {
                this.setSeqNum(seqNum);
                this.infraLight(+RegExp.$1, +RegExp.$2);
                return true;
            }
        },
        {
            regex: /^reset seq$/,
            handler: () => {
                this.setSeqNum(-1);
                return true;
            }
        },
        {
            regex: /^reset rates$/,
            handler: () => {
                this.resetRates();
                return true;
            }
        },
    ];

    let matchingCase = cases.find(aCase => command.match(aCase.regex));
    return matchingCase.handler();
};

Robot.prototype.encrypt = function (text, decrypt) {
    if (typeof text !== 'string') {
        return false;
    } else if (this.encryption.length === 0) {
        return text;
    }

    var output = '';
    for (var i = 0; i < text.length; i++) {
        var code = text.charCodeAt(i),
            shift = +this.encryption[i % this.encryption.length];

        code = decrypt ? code - shift : code + shift;
        code = (code - 32) % (127 - 32);
        if (code < 0) {
            code += 127 - 32;
        }
        code += 32;

        output += String.fromCharCode(code);
    }
    this._logger.log('"' + text + '" ' + (decrypt ? 'decrypted' : 'encrypted') +
        ' to "' + output + '"');
    return output;
};

Robot.prototype.decrypt = function (text) {
    return this.encrypt(text, true);
};

Robot.prototype.setEncryption = function (keys) {
    if (keys instanceof Array) {
        this.encryption = keys;
        this._logger.log(this.mac_addr + ' encryption set to [' + keys + ']');
        return true;
    } else {
        this._logger.log('invalid encryption key ' + keys);
        return false;
    }
};

Robot.prototype.playBlinks = function (states) {
    this.lastBlinkStates = states;
    var myself = this,
        index = 0,
        pause = true,
        repeat,
        step = function () {
            if (states != myself.lastBlinkStates) {
                return;
            }
            if (pause) {
                for (repeat = 0; repeat < 3; repeat++) {
                    myself.setLed(0, '_off');
                    myself.setLed(1, '_off');
                }
                pause = false;
                setTimeout(step, 200);
            } else if (index < states.length) {
                for (repeat = 0; repeat < 2; repeat++) {
                    myself.setLed(0, states[index] & 0x1 ? '_on' : '_off');
                    myself.setLed(1, states[index] & 0x2 ? '_on' : '_off');
                }
                pause = true;
                index += 1;
                setTimeout(step, 800);
            }
        };
    setTimeout(step, 0);
};

Robot.prototype.randomEncryption = function () {
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
    this.setSeqNum(-1);
    this.resetRates();
    this.setEncryption(keys);
    this.playBlinks(blinks);
};

Robot.prototype.resetEncryption = function () {
    this.setSeqNum(-1);
    this.resetRates();
    this.setEncryption([]);
    this.playBlinks([3]);
};

module.exports = Robot;

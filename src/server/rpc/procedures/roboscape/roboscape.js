/*
 * Author: Miklos Maroti <mmaroti@gmail.com>
 * 
 * Robot to server messages:
 *  mac_addr[6] time[4] 'I': identification, sent every second
 *  mac_addr[6] time[4] 'S' left[2] right[2]: driving speed response
 *  mac_addr[6] time[4] 'B' msec[2] tone[2]: beep response
 *  mac_addr[6] time[4] 'W' bits[1]: whiskers status
 *  mac_addr[6] time[4] 'R' dist[2]: ultrasound ranging response
 *  mac_addr[6] time[4] 'T' left[4] right[4]: wheel ticks
 *  mac_addr[6] time[4] 'D' left[2] right[2]: drive distance
 *  mac_addr[6] time[4] 'P' status[1]: button pressed
 *  mac_addr[6] time[4] 'L' led[1] cmd[1]: LED state change
 *  mac_addr[6] time[4] 'F' bits[1]: infra red detection event
 *  mac_addr[6] time[4] 'G' msec[2] pwr[1]: send infra red light
 * 
 * Server to robot messages:
 *  'S' left[2] right[2]: set driving speed
 *  'B' msec[2] tone[2]: beep
 *  'R': ultrasound ranging
 *  'T': get wheel ticks
 *  'D' left[2] right[2]: drive certain distance
 *  'L' led[1] state[1]: change LED state
 *  'G' msec[2] pwr[1]: send infra red light
 * 
 * Environment variables:
 *  ROBOSCAPE_PORT: set it to the UDP port (1973) to enable this module
 *  ROBOSCAPE_MODE: sets the NetsBlox interface type, can be "security", 
 *      "native" or "both" (default)
 */

'use strict';

var debug = require('debug'),
    log = debug('netsblox:rpc:roboscape'),
    // log = console.log,
    dgram = require('dgram'),
    server = dgram.createSocket('udp4'),
    SocketManager = require('../../../socket-manager'),
    FORGET_TIME = 120, // forgetting a robot in seconds
    RESPONSE_TIMEOUT = 200, // waiting for response in milliseconds
    ROBOSCAPE_MODE = process.env.ROBOSCAPE_MODE || 'both';

var Robot = function (mac_addr, ip4_addr, ip4_port) {
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
};

Robot.prototype.setTotalRate = function (rate) {
    log('set total rate ' + this.mac_addr + ' ' + rate);
    this.totalRate = Math.max(rate, 0);
};

Robot.prototype.setClientRate = function (rate, penalty) {
    log('set client rate ' + this.mac_addr + ' ' + rate + ' ' + penalty);
    this.clientRate = Math.max(rate, 0);
    this.clientPenalty = Math.min(Math.max(penalty, 0), 60);
};

Robot.prototype.resetRates = function () {
    log('reset rate limits');
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
        log(clientId + ' client penalty');
        return false;
    }

    if (this.clientRate !== 0 && client.count + 1 > this.clientRate) {
        log(clientId + ' client rate violation');
        client.penalty = 1 + this.clientPenalty;
        return false;
    }

    if (this.totalRate !== 0 && this.totalCount + 1 > this.totalRate) {
        log(clientId + ' total rate violation');
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
        log('register ' + uuid + ' ' + this.mac_addr);
        this.sockets.push(uuid);
        return true;
    }
    return false;
};

Robot.prototype.removeClientSocket = function (uuid) {
    var i = this.sockets.indexOf(uuid);
    if (i >= 0) {
        log('unregister ' + uuid + ' ' + this.mac_addr);
        this.sockets.splice(i, 1);
        return true;
    }
    return false;
};

Robot.prototype.sendToRobot = function (message) {
    server.send(message, this.ip4_port, this.ip4_addr, function (err) {
        if (err) {
            log('send error ' + err);
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

    log('set speed ' + this.mac_addr + ' ' + left + ' ' + right);
    var message = Buffer.alloc(5);
    message.write('S', 0, 1);
    message.writeInt16LE(left, 1);
    message.writeInt16LE(right, 3);
    this.sendToRobot(message);
};

Robot.prototype.setLed = function (led, cmd) {
    if (!('' + cmd).startsWith('_')) {
        log('set led ' + this.mac_addr + ' ' + led + ' ' + cmd);
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

    log('beep ' + this.mac_addr + ' ' + msec + ' ' + tone);
    var message = Buffer.alloc(5);
    message.write('B', 0, 1);
    message.writeUInt16LE(msec, 1);
    message.writeUInt16LE(tone, 3);
    this.sendToRobot(message);
};

Robot.prototype.infraLight = function (msec, pwr) {
    msec = Math.min(Math.max(+msec, 0), 1000);
    pwr = Math.round(2.55 * (100 - Math.min(Math.max(+pwr, 0), 100)));

    log('infra light ' + this.mac_addr + ' ' + msec);
    var message = Buffer.alloc(4);
    message.write('G', 0, 1);
    message.writeUInt16LE(msec, 1);
    message.writeUInt8(pwr, 3);
    this.sendToRobot(message);
};

Robot.prototype.getRange = function () {
    log('get range ' + this.mac_addr);
    var promise = this.receiveFromRobot('range');
    var message = Buffer.alloc(1);
    message.write('R', 0, 1);
    this.sendToRobot(message);
    return promise;
};

Robot.prototype.getTicks = function () {
    log('get ticks ' + this.mac_addr);
    var promise = this.receiveFromRobot('ticks');
    var message = Buffer.alloc(1);
    message.write('T', 0, 1);
    this.sendToRobot(message);
    return promise;
};

Robot.prototype.drive = function (left, right) {
    left = Math.max(Math.min(+left, 64), -64);
    right = Math.max(Math.min(+right, 64), -64);

    log('drive ' + this.mac_addr + ' ' + left + ' ' + right);
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
            var socket = SocketManager.getSocket(uuid);
            if (socket) {
                socket.send({
                    type: 'message',
                    dstId: socket.role,
                    msgType: 'robot command',
                    content: {
                        robot: mac_addr,
                        command: command
                    }
                });
            }
        });
    }
};

Robot.prototype.sendToClient = function (msgType, content, fields) {
    var myself = this;

    content.robot = this.mac_addr;
    content.time = this.timestamp;

    if (msgType !== 'set led') {
        log('event ' + msgType + ' ' + JSON.stringify(content));
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
        var socket = SocketManager.getSocket(uuid);
        if (socket) {
            if (ROBOSCAPE_MODE === 'native' || ROBOSCAPE_MODE === 'both') {
                socket.send({
                    type: 'message',
                    dstId: socket.role,
                    msgType: msgType,
                    content: content
                });
            }

            if (ROBOSCAPE_MODE === 'security' || ROBOSCAPE_MODE === 'both') {
                var text = msgType;
                for (var i = 0; i < fields.length; i++) {
                    text += ' ' + content[fields[i]];
                }

                socket.send({
                    type: 'message',
                    dstId: socket.role,
                    msgType: 'robot message',
                    content: {
                        robot: myself.mac_addr,
                        message: myself.encrypt(text.trim())
                    }
                });
            }
        }
    });
};

Robot.prototype.onMessage = function (message) {
    if (message.length < 11) {
        log('invalid message ' + this.ip4_addr + ':' + this.ip4_port +
            ' ' + message.toString('hex'));
        return;
    }

    var oldTimestamp = this.timestamp;
    this.timestamp = message.readUInt32LE(6);
    var command = message.toString('ascii', 10, 11);
    var state;

    if (command === 'I' && message.length === 11) {
        if (this.timestamp < oldTimestamp) {
            log('robot was rebooted');
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
        log('unknown ' + this.ip4_addr + ':' + this.ip4_port +
            ' ' + message.toString('hex'));
    }
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
            shift = this.encryption[i % this.encryption.length];
        code = decrypt ? code - shift : code + shift;
        while (code < 32) {
            code += 127 - 32;
        }
        while (code >= 127) {
            code -= 127 - 32;
        }
        output += String.fromCharCode(code);
    }
    log('"' + text + '" ' + (decrypt ? 'decrypted' : 'encrypted') +
        ' to "' + output + '"');
    return output;
};

Robot.prototype.decrypt = function (text) {
    return this.encrypt(text, true);
};

Robot.prototype.setEncryption = function (keys) {
    if (keys instanceof Array) {
        this.encryption = keys;
        log(this.mac_addr + ' encryption set to [' + keys + ']');
        return true;
    } else {
        log('invalid encryption key ' + keys);
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
    this.setEncryption(keys);
    blinks.push(3);
    this.playBlinks(blinks);
};

Robot.prototype.resetEncryption = function () {
    this.setEncryption([]);
    this.playBlinks([3]);
};

/*
 * RoboScape - This constructor is called on the first 
 * request to an RPC from a given room.
 * @constructor
 * @return {undefined}
 */
var RoboScape = function () {
    this._state = {
        registered: {}
    };
};

RoboScape.serviceName = 'RoboScape';
RoboScape.prototype._robots = {};

RoboScape.prototype._addRobot = function (mac_addr, ip4_addr, ip4_port) {
    var robot = this._robots[mac_addr];
    if (!robot) {
        log('discovering ' + mac_addr);
        robot = new Robot(mac_addr, ip4_addr, ip4_port);
        this._robots[mac_addr] = robot;
    } else {
        robot.updateAddress(ip4_addr, ip4_port);
    }
    return robot;
};

RoboScape.prototype._getRobot = function (robot) {
    robot = '' + robot;
    if (robot.length === 6) {
        return RoboScape.prototype._robots[robot];
    }
    for (var mac_addr in RoboScape.prototype._robots) {
        if (mac_addr.endsWith(robot))
            return RoboScape.prototype._robots[mac_addr];
    }
};

RoboScape.prototype._heartbeat = function () {
    for (var mac_addr in RoboScape.prototype._robots) {
        var robot = RoboScape.prototype._robots[mac_addr];
        if (!robot.heartbeat()) {
            log('forgetting ' + mac_addr);
            delete RoboScape.prototype._robots[mac_addr];
        }
    }
    setTimeout(RoboScape.prototype._heartbeat, 1000);
};

/**
 * Returns the MAC addresses of the registered robots for this client.
 * @returns {array} the list of registered robots
 */
RoboScape.prototype._getRegistered = function () {
    var state = this._state,
        robots = [];
    for (var mac_addr in state.registered) {
        if (this._robots[mac_addr].isMostlyAlive()) {
            robots.push(mac_addr);
        } else {
            delete state.registered[mac_addr];
        }
    }
    return robots;
};

/**
 * Registers for receiving messages from the given robots.
 * @param {array} robots one or a list of robots
 */
RoboScape.prototype.listen = function (robots) {
    var state = this._state,
        uuid = this.socket.uuid;

    for (var mac_addr in state.registered) {
        if (this._robots[mac_addr]) {
            this._robots[mac_addr].removeClientSocket(uuid);
        }
    }
    state.registered = {};

    if (!Array.isArray(robots)) {
        robots = ('' + robots).split(/[, ]/);
    }

    var ok = true;
    for (var i = 0; i < robots.length; i++) {
        var robot = this._getRobot(robots[i]);
        if (robot) {
            state.registered[robot.mac_addr] = robot;
            robot.addClientSocket(uuid);
        } else {
            ok = false;
        }
    }
    return ok;
};

if (ROBOSCAPE_MODE === 'native' || ROBOSCAPE_MODE === 'both') {
    /**
     * Returns the MAC addresses of all robots.
     * @returns {array}
     */
    RoboScape.prototype.getRobots = function () {
        return Object.keys(RoboScape.prototype._robots);
    };

    /**
     * Returns true if the given robot is alive, sent messages in the
     * last two seconds.
     * @returns {boolean} True if the robot is alive
     */
    RoboScape.prototype.isAlive = function (robot) {
        robot = this._getRobot(robot);
        if (robot && robot.accepts(this.socket.uuid)) {
            return robot.isAlive();
        }
        return false;
    };

    /**
     * Sets the wheel speed of the given robots.
     * @param {string} robot name of the robot (matches at the end)
     * @param {number} left speed of the left wheel in [-128, 128]
     * @param {number} right speed of the right wheel in [-128, 128]
     * @returns {boolean} True if the robot was found
     */
    RoboScape.prototype.setSpeed = function (robot, left, right) {
        robot = this._getRobot(robot);
        if (robot && robot.accepts(this.socket.uuid)) {
            robot.setSpeed(left, right);
            return true;
        }
        return false;
    };

    /**
     * Sets one of the LEDs of the given robots.
     * @param {string} robot name of the robot (matches at the end)
     * @param {number} led the number of the LED (0 or 1)
     * @param {number} command false/off/0, true/on/1, or toggle/2
     * @returns {boolean} True if the robot was found
     */
    RoboScape.prototype.setLed = function (robot, led, command) {
        robot = this._getRobot(robot);
        if (robot && robot.accepts(this.socket.uuid)) {
            robot.setLed(led, command);
            return true;
        }
        return false;
    };

    /**
     * Beeps with the speaker.
     * @param {string} robot name of the robot (matches at the end)
     * @param {number} msec duration in milliseconds
     * @param {number} tone frequency of the beep in Hz
     * @returns {boolean} True if the robot was found
     */
    RoboScape.prototype.beep = function (robot, msec, tone) {
        robot = this._getRobot(robot);
        if (robot && robot.accepts(this.socket.uuid)) {
            robot.beep(msec, tone);
            return true;
        }
        return false;
    };

    /**
     * Turns on the infra red LED.
     * @param {string} robot name of the robot (matches at the end)
     * @param {number} msec duration in milliseconds between 0 and 1000
     * @param {number} pwr power level between 0 and 100
     * @returns {boolean} True if the robot was found
     */
    RoboScape.prototype.infraLight = function (robot, msec, pwr) {
        robot = this._getRobot(robot);
        if (robot && robot.accepts(this.socket.uuid)) {
            robot.infraLight(msec, pwr);
            return true;
        }
        return false;
    };

    /**
     * Ranges with the ultrasound sensor
     * @param {string} robot name of the robot (matches at the end)
     * @returns {number} range in centimeters
     */
    RoboScape.prototype.getRange = function (robot) {
        robot = this._getRobot(robot);
        if (robot && robot.accepts(this.socket.uuid)) {
            return robot.getRange().then(function (value) {
                return value && value.range;
            });
        }
        return false;
    };

    /**
     * Returns the current number of wheel ticks (1/64th rotations)
     * @param {string} robot name of the robot (matches at the end)
     * @returns {array} the number of ticks for the left and right wheels
     */
    RoboScape.prototype.getTicks = function (robot) {
        robot = this._getRobot(robot);
        if (robot && robot.accepts(this.socket.uuid)) {
            return robot.getTicks().then(function (value) {
                return value && [value.left, value.right];
            });
        }
        return false;
    };

    /**
     * Drives the whiles for the specified ticks.
     * @param {string} robot name of the robot (matches at the end)
     * @param {number} left distance for left wheel in ticks
     * @param {number} right distance for right wheel in ticks
     * @returns {boolean} True if the robot was found
     */
    RoboScape.prototype.drive = function (robot, left, right) {
        robot = this._getRobot(robot);
        if (robot && robot.accepts(this.socket.uuid)) {
            robot.drive(left, right);
            return true;
        }
        return false;
    };

    /**
     * Sets the total message limit for the given robot.
     * @param {string} robot name of the robot (matches at the end)
     * @param {number} rate number of messages per seconds
     * @returns {boolean} True if the robot was found
     */
    RoboScape.prototype.setTotalRate = function (robot, rate) {
        robot = this._getRobot(robot);
        if (robot && robot.accepts(this.socket.uuid)) {
            robot.setTotalRate(rate);
            return true;
        }
        return false;
    };

    /**
     * Sets the client message limit and penalty for the given robot.
     * @param {string} robot name of the robot (matches at the end)
     * @param {number} rate number of messages per seconds
     * @param {number} penalty number seconds of penalty if rate is violated
     * @returns {boolean} True if the robot was found
     */
    RoboScape.prototype.setClientRate = function (robot, rate, penalty) {
        robot = this._getRobot(robot);
        if (robot && robot.accepts(this.socket.uuid)) {
            robot.setClientRate(rate, penalty);
            return true;
        }
        return false;
    };
}

if (ROBOSCAPE_MODE === 'security' || ROBOSCAPE_MODE === 'both') {
    /**
     * Sends a textual command to the robot
     * @param {string} robot name of the robot (matches at the end)
     * @param {string} command textual command
     * @returns {string} textual response
     */
    RoboScape.prototype.send = function (robot, command) {
        // log('send ' + robot + ' ' + command);
        robot = this._getRobot(robot);

        if (robot && typeof command === 'string') {
            if (command.match(/^reset key$/)) {
                robot.setSeqNum(-1);
                robot.setEncryption([]);
                return true;
            }

            // for replay attacks
            robot.commandToClient(command);

            command = robot.decrypt(command);
            var seqNum = -1;
            if (command.match(/^(\d+)[, ](.*)$/)) {
                seqNum = +RegExp.$1;
                command = RegExp.$2;
            }
            if (!robot.accepts(this.socket.uuid, seqNum)) {
                return false;
            }

            if (command.match(/^is alive$/)) {
                robot.setSeqNum(seqNum);
                robot.sendToClient('alive', {}, ['time']);
                return robot.isAlive();
            } else if (command.match(/^beep (-?\d+)[, ](-?\d+)$/)) {
                robot.setSeqNum(seqNum);
                robot.beep(+RegExp.$1, +RegExp.$2);
                return true;
            } else if (command.match(/^set speed (-?\d+)[, ](-?\d+)$/)) {
                robot.setSeqNum(seqNum);
                robot.setSpeed(+RegExp.$1, +RegExp.$2);
                return true;
            } else if (command.match(/^drive (-?\d+)[, ](-?\d+)$/)) {
                robot.setSeqNum(seqNum);
                robot.drive(+RegExp.$1, +RegExp.$2);
                return true;
            } else if (command.match(/^get range$/)) {
                robot.setSeqNum(seqNum);
                return robot.getRange().then(function (value) {
                    return value && value.range;
                });
            } else if (command.match(/^get ticks$/)) {
                robot.setSeqNum(seqNum);
                return robot.getTicks().then(function (value) {
                    return value && [value.left, value.right];
                });
            } else if (command.match(/^set key(| -?\d+([ ,]-?\d+)*)$/)) {
                robot.setSeqNum(seqNum);
                var encryption = RegExp.$1.split(/[, ]/);
                if (encryption[0] === '') {
                    encryption.splice(0, 1);
                }
                return robot.setEncryption(encryption.map(Number));
            } else if (command.match(/^set total rate (-?\d+)$/)) {
                robot.setSeqNum(seqNum);
                robot.setTotalRate(+RegExp.$1);
                return true;
            } else if (command.match(/^set client rate (-?\d+)[, ](-?\d+)$/)) {
                robot.setSeqNum(seqNum);
                robot.setClientRate(+RegExp.$1, +RegExp.$2);
                return true;
            } else if (command.match(/^set led (-?\d+)[, ](-?\d+)$/)) {
                robot.setSeqNum(seqNum);
                robot.setLed(+RegExp.$1, +RegExp.$2);
                return true;
            } else if (command.match(/^infra light (-?\d+)[, ](-?\d+)$/)) {
                robot.setSeqNum(seqNum);
                robot.infraLight(+RegExp.$1, +RegExp.$2);
                return true;
            } else if (command.match(/^reset seq$/)) {
                robot.setSeqNum(-1);
                return true;
            } else if (command.match(/^reset rates$/)) {
                robot.resetRates();
                return true;
            }
        }
        return false;
    };
}

server.on('listening', function () {
    var local = server.address();
    log('listening on ' + local.address + ':' + local.port);
});

server.on('message', function (message, remote) {
    if (message.length < 6) {
        log('invalid message ' + remote.address + ':' +
            remote.port + ' ' + message.toString('hex'));
    } else {
        var mac_addr = message.toString('hex', 0, 6);
        var robot = RoboScape.prototype._addRobot(
            mac_addr, remote.address, remote.port);
        robot.onMessage(message);
    }
});

/* eslint no-console: off */
if (process.env.ROBOSCAPE_PORT) {
    console.log('ROBOSCAPE_PORT is ' + process.env.ROBOSCAPE_PORT);
    server.bind(process.env.ROBOSCAPE_PORT || 1973);

    setTimeout(RoboScape.prototype._heartbeat, 1000);
    module.exports = RoboScape;
} else {
    console.log('ROBOSCAPE_PORT is not set (to 1973), RoboScape is disabled');
}

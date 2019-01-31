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

const logger = require('../utils/logger')('roboscape');
const Robot = require('./robot');
var dgram = require('dgram'),
    server = dgram.createSocket('udp4'),
    ROBOSCAPE_MODE = process.env.ROBOSCAPE_MODE || 'both';

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
        logger.log('discovering ' + mac_addr + ' at ' + ip4_addr + ':' + ip4_port);
        robot = new Robot(mac_addr, ip4_addr, ip4_port, server);
        this._robots[mac_addr] = robot;
    } else {
        robot.updateAddress(ip4_addr, ip4_port);
    }
    return robot;
};

RoboScape.prototype._getRobot = function (robot) {
    robot = '' + robot;
    if(robot.length < 4) return undefined;
    if (robot.length === 12) {
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
            logger.log('forgetting ' + mac_addr);
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
 * @deprecated
 */
RoboScape.prototype.eavesdrop = function (robots) {
    return this.listen(robots);
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

/**
 * Returns the MAC addresses of all robots.
 * @returns {array}
 */
RoboScape.prototype.getRobots = function () {
    return Object.keys(RoboScape.prototype._robots);
};

if (ROBOSCAPE_MODE === 'native' || ROBOSCAPE_MODE === 'both') {
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
        // logger.log('send ' + robot + ' ' + command);
        robot = this._getRobot(robot);

        if (robot && typeof command === 'string') {
            if (command.match(/^backdoor[, ](.*)$/)) {
                logger.log('executing ' + command);
                command = RegExp.$1;
            } else {
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
    logger.log('listening on ' + local.address + ':' + local.port);
});

server.on('message', function (message, remote) {
    if (message.length < 6) {
        logger.log('invalid message ' + remote.address + ':' +
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
}

RoboScape.isSupported = function () {
    if (!process.env.ROBOSCAPE_PORT) {
        console.log('ROBOSCAPE_PORT is not set (to 1973), RoboScape is disabled');
    }
    return !!process.env.ROBOSCAPE_PORT;
};

module.exports = RoboScape;

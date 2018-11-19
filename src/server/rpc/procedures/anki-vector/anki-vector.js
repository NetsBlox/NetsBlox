/**
 * Based on Roboscape RPC.
 * Environment variables:
 *  ANKI_PORT: set it to the UDP port (1974) to enable this module
 */
'use strict';

const logger = require('../utils/logger')('anki-vector');
var dgram = require('dgram'),
    server = dgram.createSocket('udp4'),
    NetworkTopology = require('../../../network-topology'),
    FORGET_TIME = 120, // forgetting a robot in seconds
    RESPONSE_TIMEOUT = 200,
    DEFAULT_PORT = 1983;

var Robot = function (name, ip4_addr, ip4_port) {
    this.name = name;
    this.ip4_addr = ip4_addr;
    this.ip4_port = ip4_port;
    this.heartbeats = 0;
    this.timestamp = -1; // time of last message in robot time
};


Robot.prototype.updateAddress = function (ip4_addr, ip4_port) {
    this.ip4_addr = ip4_addr;
    this.ip4_port = ip4_port;
    this.heartbeats = 0;
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
        logger.log('register ' + uuid + ' ' + this.name);
        this.sockets.push(uuid);
        return true;
    }
    return false;
};

Robot.prototype.removeClientSocket = function (uuid) {
    var i = this.sockets.indexOf(uuid);
    if (i >= 0) {
        logger.log('unregister ' + uuid + ' ' + this.name);
        this.sockets.splice(i, 1);
        return true;
    }
    return false;
};

Robot.prototype.sendToRobot = function (message) {
    server.send(message, this.ip4_port, this.ip4_addr, function (err) {
        if (err) {
            logger.log('send error ' + err);
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


Robot.prototype.sendToClient = function (msgType, content, fields) {
    content.robot = this.name;
    content.time = this.timestamp;

    if (msgType !== 'set led') {
        logger.log('event ' + msgType + ' ' + JSON.stringify(content));
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
            socket.sendMessage(msgType, content);
        } else {
            logger.log('socket not found for ' + uuid);
        }
    });
};

Robot.prototype.onMessage = function (message) {
    logger.log('message ' + this.ip4_addr + ':' + this.ip4_port +
            ' ' + message.toString('hex'));
};

/*
 * AnkiService - This constructor is called on the first 
 * request to an RPC from a given room.
 * @constructor
 * @return {undefined}
 */
var AnkiService = function () {
    this._state = {
        registered: {}
    };
};

AnkiService.serviceName = 'AnkiService';
AnkiService.prototype._robots = {};

AnkiService.prototype._addRobot = function (name, ip4_addr, ip4_port) {
    var robot = this._robots[name];
    if (!robot) {
        logger.log('discovering ' + name + ' at ' + ip4_addr + ':' + ip4_port);
        robot = new Robot(name, ip4_addr, ip4_port);
        this._robots[name] = robot;
    } else {
        robot.updateAddress(ip4_addr, ip4_port);
    }
    return robot;
};

AnkiService.prototype._getRobot = function (robot) {
    robot = '' + robot;
    if(robot.length < 4) return undefined;
    if (robot.length === 12) {
        return AnkiService.prototype._robots[robot];
    }
    for (var name in AnkiService.prototype._robots) {
        if (name.endsWith(robot))
            return AnkiService.prototype._robots[name];
    }
};

AnkiService.prototype._heartbeat = function () {
    for (var name in AnkiService.prototype._robots) {
        var robot = AnkiService.prototype._robots[name];
        if (!robot.heartbeat()) {
            logger.log('forgetting ' + name);
            delete AnkiService.prototype._robots[name];
        }
    }
    setTimeout(AnkiService.prototype._heartbeat, 1000);
};

/**
 * Returns the names of the registered robots for this client.
 * @returns {Array} the list of registered robots
 */
AnkiService.prototype._getRegistered = function () {
    var state = this._state,
        robots = [];
    for (var name in state.registered) {
        if (this._robots[name].isMostlyAlive()) {
            robots.push(name);
        } else {
            delete state.registered[name];
        }
    }
    return robots;
};

/**
 * Returns the names of all robots.
 * @returns {Array}
 */
AnkiService.prototype.getRobots = function () {
    return Object.keys(AnkiService.prototype._robots);
};

/**
 * Sends a command to a robot.
 * @param {String} robot Robot to send command to
 * @param {String} command Command to send
 * @returns {Boolean} Was command sent
 */
AnkiService.prototype.sendCommand = function (robot, command) {
    robot = this._getRobot(robot);

    if (robot){
        robot.sendToRobot(robot.name + ":" +command);
        return true;
    }
    
    return false;
}
    
server.on('listening', function () {
    var local = server.address();
    logger.log('listening on ' + local.address + ':' + local.port);
});

server.on('message', function (message, remote) {
    logger.log('message ' + remote.address + ':' +
        remote.port + ' ' + message.toString('ascii'));
    if (message.length < 6) {
        logger.log('invalid message ' + remote.address + ':' +
            remote.port + ' ' + message.toString('ascii'));
    } else {
        var name = message.toString('ascii', 0, 11);
        var robot = AnkiService.prototype._addRobot(
            name, remote.address, remote.port);
        robot.onMessage(message);
    }
});

/* eslint no-console: off */
if (process.env.ANKI_PORT) {
    console.log('ANKI_PORT is ' + process.env.ANKI_PORT);
    server.bind(process.env.ANKI_PORT || DEFAULT_PORT);

    setTimeout(AnkiService.prototype._heartbeat, 1000);
}

AnkiService.isSupported = function () {
    if (!process.env.ANKI_PORT) {
        console.log(`ANKI_PORT is not set (to ${DEFAULT_PORT}), Anki is disabled`);
    }
    return !!process.env.ANKI_PORT;
};

module.exports = AnkiService;

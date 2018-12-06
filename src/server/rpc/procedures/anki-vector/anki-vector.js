/**
 * Controls Anki Vector robots. Based on Roboscape RPC.
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
    DEFAULT_PORT = 1983,
    ANKI_MODE = process.env.ANKI_MODE || 'both';

var Robot = function (name, ip4_addr, ip4_port) {
    this.name = name;
    this.ip4_addr = ip4_addr;
    this.ip4_port = ip4_port;
    this.heartbeats = 0;
    this.timestamp = -1; // time of last message in robot time
    this.callbacks = {};
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
    server.send(this.name + ':' + message, this.ip4_port, this.ip4_addr, function (err) {
        if (err) {
            logger.log('send error ' + err);
        }
    });
};

Robot.prototype.receiveFromRobot = function (seq, timeout) {
    if (!this.callbacks[seq]) {
        this.callbacks[seq] = [];
    }
    var callbacks = this.callbacks[seq];

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

Robot.prototype.onMessage = function (message) {
    logger.log(`message from ${this.ip4_addr}:${this.ip4_port} to robot ${this.name} : ${message.toString('hex')}`);

    message = message.trim();

    // Not valid response
    if(message.length < 2 || message.indexOf(' ') === -1)
    {
        logger.log('message invalid');
        return;
    }
    
    let seq = parseInt(message.split(' ')[0]);

    // Not valid response
    if(seq === NaN)
    {
        logger.log('sequence number invalid');
        return;
    }

    logger.log(message);

    // Handle callbacks
    if (this.callbacks[seq]) {
        var callbacks = this.callbacks[seq];
        delete this.callbacks[seq];
        callbacks.forEach(function (callback) {
            callback(message.substr(message.indexOf(' ')));
        });
        callbacks.length = 0;
    }
};

/*
 * AnkiService - This constructor is called on the first 
 * request to an RPC from a given room.
 * @constructor
 * @return {undefined}
 */
var AnkiService = function () {
    this._state = {
        registered: {},
        seqNum: 0
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

if(ANKI_MODE == 'text' || ANKI_MODE == 'both'){
    /**
     * Sends a command to a robot.
     * @param {String} robot Robot to send command to
     * @param {String} command Command to send
     * @returns {Boolean} Was command sent
     */
    AnkiService.prototype.sendCommand = function (robot, command) {
        robot = this._getRobot(robot);

        if (robot){
            robot.sendToRobot(command);
            return true;
        }
        
        return false;
    }


    /**
     * Request data from robot.
     * @param {String} robot Robot to send request to
     * @param {String} request Request to send
     * @returns {Object} Result of request
     */
    AnkiService.prototype.sendRequest = function (robot, request) {
        robot = this._getRobot(robot);

        // Generate sequence number
        let seq = this._state.seqNum++;

        if (robot){
            var promise = robot.receiveFromRobot(seq);
            robot.sendToRobot(seq + ' ' + request);
            return promise.then((result) => result && JSON.parse(result));
        }
        
        return false;
    }
}

// RPC commands
if(ANKI_MODE == 'simple' || ANKI_MODE == 'both')
{
    /**
     * Drive a set number of millimeters
     * @param {String} robot Robot to send command to
     * @param {Number} distance Millimeters to drive
     * @returns {Boolean} Was command sent
     */
    AnkiService.prototype.driveMM = function (robot, distance) {
        robot = this._getRobot(robot);

        if (robot){
            robot.sendToRobot(`drivemm ${distance}`);
            return true;
        }
        
        return false;
    }

    /**
     * Turn a set angle
     * @param {String} robot Robot to send command to
     * @param {Number} angle Degrees to turn
     * @returns {Boolean} Was command sent
     */
    AnkiService.prototype.turn = function (robot, distance) {
        robot = this._getRobot(robot);

        if (robot){
            robot.sendToRobot(`turn ${distance}`);
            return true;
        }
        
        return false;
    }

    
    /**
     * Raise the arm
     * @param {String} robot Robot to send command to
     * @returns {Boolean} Was command sent
     */
    AnkiService.prototype.raiseArm = function (robot) {
        robot = this._getRobot(robot);

        if (robot){
            robot.sendToRobot('set lift 1');
            return true;
        }
        
        return false;
    }    

    /**
     * Lower the arm
     * @param {String} robot Robot to send command to
     * @returns {Boolean} Was command sent
     */
    AnkiService.prototype.lowerArm = function (robot) {
        robot = this._getRobot(robot);

        if (robot){
            robot.sendToRobot('set lift 0');
            return true;
        }
        
        return false;
    }
    
    /**
     * Make the robot speak
     * @param {String} robot Robot to send command to
     * @param {String} text Text to read aloud
     * @returns {Boolean} Was command sent
     */
    AnkiService.prototype.say = function (robot) {
        robot = this._getRobot(robot);

        if (robot){
            robot.sendToRobot(`say ${text}`);
            return true;
        }
        
        return false;
    }

    
    /**
     * Make the robot drive with a given speed
     * @param {String} robot Robot to send command to
     * @param {Number} left Speed of left treads
     * @param {Number} right Speed of right treads
     * @returns {Boolean} Was command sent
     */
    AnkiService.prototype.setSpeed = function (robot, left, right) {
        robot = this._getRobot(robot);

        if (robot){
            robot.sendToRobot(`set speed ${left} ${right}`);
            return true;
        }
        
        return false;
    }
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
        robot.onMessage(message.toString('ascii', 12));
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

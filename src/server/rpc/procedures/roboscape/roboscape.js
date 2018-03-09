/**
 * Author: Miklos Maroti <mmaroti@gmail.com>
 * 
 * Robot to server messages:
 *  mac_addr[6] time[4] 'I': identification, sent every second
 *  mac_addr[6] time[4] 'W' left[2] right[2]: wheel ack
 * 
 * Server to robot messages:
 *  'W' left[2] right[2]: sets the wheel speeds
 */

'use strict';

var debug = require('debug'),
    log = debug('netsblox:rpc:roboscape'),
    // log = console.log,
    dgram = require('dgram'),
    server = dgram.createSocket('udp4'),
    PORT = 1973, // listening UDP port
    FORGET_TIME = 30; // forgetting a robot

/**
 * RoboScape - This constructor is called on the first 
 * request to an RPC from a given room.
 *
 * @constructor
 * @return {undefined}
 */
var RoboScape = function () {};

RoboScape.serviceName = 'RoboScape';
RoboScape.prototype._robots = {};

RoboScape.prototype._addRobot = function (mac_addr, ip4_addr, ip4_port) {
    var robot = this._robots[mac_addr];
    if (!robot) {
        log('adding robot ' + mac_addr);
        robot = {
            mac_addr: mac_addr,
            ip4_addr: ip4_addr,
            ip4_port: ip4_port,
            tick: FORGET_TIME,
            time: -1,
        };
        this._robots[mac_addr] = robot;
    } else {
        robot.ip4_addr = ip4_addr;
        robot.ip4_port = ip4_port;
        robot.tick = FORGET_TIME;
    }
    return robot;
};

RoboScape.prototype._getRobot = function (robot) {
    if (typeof robot === 'string') {
        if (robot.length === 6) {
            return RoboScape.prototype._robots[robot];
        }
        for (var mac_addr in RoboScape.prototype._robots) {
            if (mac_addr.endsWith(robot))
                return RoboScape.prototype._robots[mac_addr];
        }
    }
    return undefined;
}

RoboScape.prototype._tick = function () {
    for (var mac_addr in RoboScape.prototype._robots) {
        var robot = RoboScape.prototype._robots[mac_addr];
        robot.tick -= 1;
        if (robot.tick <= 0) {
            log('forgetting robot ' + mac_addr);
            delete RoboScape.prototype._robots[mac_addr];
        }
    }
    setTimeout(RoboScape.prototype._tick, 1000);
};

setTimeout(RoboScape.prototype._tick, 1000);

/**
 * Returns the MAC addresses of all robots.
 * @returns {array}
 */
RoboScape.prototype.getRobots = function () {
    return Object.keys(this._robots);
}

/**
 * Sets the wheel speed of the given robots.
 * @param {string} robot name of the robot (matches at the end)
 * @param {number} left speed of the left wheel in [-128, 128]
 * @param {number} right speed of the right wheel in [-128, 128]
 * @returns {boolean} True if the robot was found
 */
RoboScape.prototype.setSpeed = function (robot, left, right) {
    robot = this._getRobot(robot);
    if (!robot) {
        return false;
    }
    left = Math.max(Math.min(+left, 128), -128);
    right = Math.max(Math.min(+right, 128), -128);

    log('setting robot ' + robot.mac_addr +
        ' speed to ' + left + ' ' + right);
    var message = Buffer.alloc(5);
    message.write('W', 0, 1);
    message.writeInt16LE(left, 1);
    message.writeInt16LE(right, 3);
    server.send(message, robot.ip4_port, robot.ip4_addr, function (err) {
        if (err) {
            log('send error ' + err);
        }
    });
    return true;
}

server.on('listening', function () {
    var local = server.address();
    log('listening on ' + local.address + ':' + local.port);
});

server.on('message', function (message, remote) {
    var mac_addr = message.toString('hex', 0, 6),
        time = message.readUInt32LE(6),
        command = message.toString('ascii', 10, 11);

    var robot = RoboScape.prototype._addRobot(mac_addr, remote.address, remote.port);
    robot.time = time;

    if (command == 'I') {} else {
        var time = (new Date()).toLocaleTimeString();
        log('unknown ' + time + ' ' + remote.address + ':' +
            remote.port + ' ' + message.toString('hex'));
    }
});

server.bind(PORT);

module.exports = RoboScape;

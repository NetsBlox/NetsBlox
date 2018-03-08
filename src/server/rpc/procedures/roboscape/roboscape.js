/**
 * Author: Miklos Maroti <mmaroti@gmail.com>
 */

'use strict';

var debug = require('debug'),
    // log = debug('netsblox:rpc:roboscape'),
    log = console.log,
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
        log('RoboScape adding robot ' + mac_addr);
        robot = {}
        this._robots[mac_addr] = robot;
    }
    robot.ip4_addr = ip4_addr;
    robot.ip4_port = ip4_port;
    robot.tick = FORGET_TIME;
};

RoboScape.prototype._tick = function () {
    for (var mac_addr in RoboScape.prototype._robots) {
        var robot = RoboScape.prototype._robots[mac_addr];
        robot.tick -= 1;
        if (robot.tick <= 0) {
            log('RoboScape forgetting robot ' + mac_addr);
            delete RoboScape.prototype._robots[mac_addr];
        }
    }
    setTimeout(RoboScape.prototype._tick, 1000);
};

setTimeout(RoboScape.prototype._tick, 1000);

/**
 * Returns the MAC addresses of all robots
 * @returns {Array}
 */
RoboScape.prototype.getRobots = function () {
    return Object.keys(this._robots);
}

server.on('listening', function () {
    var local = server.address();
    log('RoboScape listening on ' + local.address + ':' + local.port);
});

server.on('message', function (message, remote) {
    var mac = message.toString('hex', 0, 6),
        cmd = message.toString('ascii', 6, 7);

    var time = (new Date()).toLocaleTimeString();
    log('RoboScape ' + time + ' ' + remote.address + ':' +
        remote.port + ' ' + message.toString('hex'));

    if (cmd == 'I') {
        RoboScape.prototype._addRobot(mac, remote.address, remote.port);
    }
});

server.bind(PORT);

module.exports = RoboScape;
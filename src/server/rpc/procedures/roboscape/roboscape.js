/**
 * Author: Miklos Maroti <mmaroti@gmail.com>
 */

'use strict';

var debug = require('debug'),
    log = debug('netsblox:rpc:roboscape'),
    dgram = require('dgram'),
    server = dgram.createSocket('udp4'),
    PORT = 1973, // listening UDP port
    FORGET_TIME = 30; // forgetting a robot

var RoboScape = {
    _robots: {}
};

RoboScape._addRobot = function (mac_addr, ip4_addr, ip4_port) {
    var robot = this._robots[mac_addr];
    if (!robot) {
        log('adding robot ' + mac_addr);
        robot = {}
        this._robots[mac_addr] = robot;
    }
    robot.ip4_addr = ip4_addr;
    robot.ip4_port = ip4_port;
    robot.tick = FORGET_TIME;
};

RoboScape._tick = function () {
    for (var mac_addr in RoboScape._robots) {
        var robot = RoboScape._robots[mac_addr];
        robot.tick -= 1;
        if (robot.tick <= 0) {
            log('forgetting robot ' + mac_addr);
            delete RoboScape._robots[mac_addr];
        }
    }
    setTimeout(RoboScape._tick, 1000);
};

setTimeout(RoboScape._tick, 1000);

/**
 * Returns the MAC addresses of all robots
 * @returns {Array}
 */
RoboScape.getRobots = function () {
    return Object.keys(RoboScape._robots);
}

server.on('listening', function () {
    var local = server.address();
    log('listening on ' + local.address + ':' + local.port);
});

server.on('message', function (message, remote) {
    RoboScape._addRobot("mac", remote.address, remote.port);
    var time = (new Date()).toLocaleTimeString();
    log(time + ' ' + remote.address + ':' + remote.port + ' ' + message);
});

server.bind(PORT);

module.export = RoboScape;

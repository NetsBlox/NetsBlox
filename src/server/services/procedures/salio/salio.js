/*
 * Based on the RoboScape procedure.
 *
 * Sensor to server messages:
 *  mac_addr[6] time[4] 'I': identification, sent every second
 *  mac_addr[6] time[4] 'A' x[4] y[4] z[4]: accelerometer data
 *
 * Server to sensor messages:
 *  'A': get accelerometer snapshot
 *
 * Environment variables:
 *  SALIO_PORT: set it to the UDP port (1975) to enable this module
 *  SALIO_MODE: sets the NetsBlox interface type, can be "security",
 *      "native" or "both" (default)
 */

'use strict';

const logger = require('../utils/logger')('SalIO');
const Sensor = require('./sensor');
const acl = require('../roboscape/accessControl');
const { assert } = require('console');
var dgram = require('dgram'),
    server = dgram.createSocket('udp4'),
    SALIO_MODE = process.env.SALIO_MODE || 'both';

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
function angle(a, b) {
    return Math.acos(dotProduct(a, b) / (magnitude(a) * magnitude(b)));
}

/*
 * SalIO - This constructor is called on the first
 * request to an RPC from a given room.
 * @constructor
 * @return {undefined}
 */
var SalIO = function () {
    this._state = {
        registered: {}
    };
};

SalIO.serviceName = 'SalIO';
// keeps a dictionary of sensor objects keyed by mac_addr
SalIO.prototype._sensors = {};

SalIO.prototype._ensureLoggedIn = function() {
    if (this.caller.username !== undefined)
        throw new Error('Login required.');
};

SalIO.prototype._ensureAuthorized = async function(sensorId) {
    await acl.ensureAuthorized(this.caller.username, sensorId);
};

// fetch the sensor and updates its address. creates one if necessary
SalIO.prototype._getOrCreateSensor = function (mac_addr, ip4_addr, ip4_port) {
    var sensor = this._sensors[mac_addr];
    if (!sensor) {
        logger.log('discovering ' + mac_addr + ' at ' + ip4_addr + ':' + ip4_port);
        sensor = new Sensor(mac_addr, ip4_addr, ip4_port, server);
        this._sensors[mac_addr] = sensor;
    } else {
        sensor.updateAddress(ip4_addr, ip4_port);
    }
    return sensor;
};

// find the sensor object based on the partial id or returns undefined
SalIO.prototype._getSensor = async function (sensorId) {
    sensorId = '' + sensorId;
    let sensor;

    if(sensorId.length < 4 || sensorId.length > 12) return undefined;

    // autocomplete the sensorId and find the sensor object
    if (sensorId.length === 12) {
        sensor = this._sensors[sensorId];
    } else { // try to guess the rest of the id
        for (var mac_addr in this._sensors) { // pick the first match
            if (mac_addr.endsWith(sensorId)) {
                sensorId = mac_addr;
                sensor = this._sensors[sensorId];
            }
        }
    }

    // if couldn't find a live sensor
    if (!sensor) return undefined;

    await this._ensureAuthorized(sensorId);
    return sensor;
};

SalIO.prototype._heartbeat = function () {
    for (var mac_addr in SalIO.prototype._sensors) {
        var sensor = SalIO.prototype._sensors[mac_addr];
        if (!sensor.heartbeat()) {
            logger.log('forgetting ' + mac_addr);
            delete SalIO.prototype._sensors[mac_addr];
        }
    }
    setTimeout(SalIO.prototype._heartbeat, 1000);
};

/**
 * Returns the MAC addresses of the registered sensors for this client.
 * @returns {array} the list of registered sensors
 */
SalIO.prototype._getRegistered = function () {
    var state = this._state,
        sensors = [];
    for (var mac_addr in state.registered) {
        if (this._sensors[mac_addr].isMostlyAlive()) {
            sensors.push(mac_addr);
        } else {
            delete state.registered[mac_addr];
        }
    }
    return sensors;
};

/**
 * Registers for receiving messages from the given sensors.
 * @param {array} sensors one or a list of sensors
 * @deprecated
 */
SalIO.prototype.eavesdrop = function (sensors) {
    return this.listen(sensors);
};

/**
 * Registers for receiving messages from the given sensors.
 * @param {array} sensors one or a list of sensors
 */
SalIO.prototype.listen = async function (sensors) {
    var state = this._state;

    for (var mac_addr in state.registered) {
        if (this._sensors[mac_addr]) {
            this._sensors[mac_addr].removeClientSocket(this.socket);
        }
    }
    state.registered = {};

    if (!Array.isArray(sensors)) {
        sensors = ('' + sensors).split(/[, ]/);
    }

    var ok = true;
    for (var i = 0; i < sensors.length; i++) {
        var sensor = await this._getSensor(sensors[i]);
        if (sensor) {
            state.registered[sensor.mac_addr] = sensor;
            sensor.addClientSocket(this.socket);
        } else {
            ok = false;
        }
    }
    return ok;
};

/**
 * Returns the MAC addresses of all authorized sensors.
 * @returns {array}
 */
SalIO.prototype.getSensors = async function () {
    const availableSensors = Object.keys(this._sensors);
    let sensors = await acl.authorizedRobots(this.caller.username, availableSensors);
    return sensors;
};

//
/**
 * Performs the pre-checks and maps the incoming call to a sensor action.
 * @param {String} fnName name of the method/function to call on the sensor object
 * @param {Array} args array of arguments
 */
SalIO.prototype._passToSensor = async function (fnName, args) {
    args = Array.from(args);
    let sensorId = args.shift();
    const sensor = await this._getSensor(sensorId);
    if (sensor && sensor.accepts(this.caller.clientId)) {
        let rv = sensor[fnName](sensor, args);
        if (rv === undefined) rv = true;
        return rv;
    }
    return false;
};

if (SALIO_MODE === 'native' || SALIO_MODE === 'both') {
    /* eslint-disable no-unused-vars */
    /**
     * Returns true if the given sensor is alive, sent messages in the
     * last two seconds.
     * @param {string} sensor name of the sensor (matches at the end)
     * @returns {boolean} True if the sensor is alive
     */
    SalIO.prototype.isAlive = function (sensor) {
        return this._passToSensor('isAlive', arguments);
    };

    /**
     * Gets the current accelerometer snapshot from the sensor.
     * @param {string} sensor name of the sensor (matches at the end)
     */
    SalIO.prototype.getAccelerometer = function (sensor) {
        return this._passToSensor('getAccelerometer', arguments);
    };
    /**
     * Gets the current accelerometer snapshot from the sensor.
     * @param {string} sensor name of the sensor (matches at the end)
     */
    SalIO.prototype.getAccelerometerDirection = async function (sensor) {
        const v = await this.getAccelerometer(sensor);
        const best = [Infinity, 'unknown'];
        for (const dir of DIRECTIONS) {
            const t = angle(v, dir[0]);
            if (t < best[0]) {
                best[0] = t;
                best[1] = dir[1];
            }
        }
        return best[1];
    };

    /**
     * Sets the total message limit for the given sensor.
     * @param {string} sensor name of the sensor (matches at the end)
     * @param {number} rate number of messages per seconds
     * @returns {boolean} True if the sensor was found
     */
    SalIO.prototype.setTotalRate = function (sensor, rate) {
        return this._passToSensor('setTotalRate', arguments);
    };

    /**
     * Sets the client message limit and penalty for the given sensor.
     * @param {string} sensor name of the sensor (matches at the end)
     * @param {number} rate number of messages per seconds
     * @param {number} penalty number seconds of penalty if rate is violated
     * @returns {boolean} True if the sensor was found
     */
    SalIO.prototype.setClientRate = function (sensor, rate, penalty) {
        return this._passToSensor('setClientRate', arguments);
    };
    /* eslint-enable no-unused-vars */
}

if (SALIO_MODE === 'security' || SALIO_MODE === 'both') {
    /**
     * Sends a textual command to the sensor
     * @param {string} sensor name of the sensor (matches at the end)
     * @param {string} command textual command
     * @returns {string} textual response
     */
    SalIO.prototype.send = async function (sensor, command) {
        sensor = await this._getSensor(sensor);

        if (!sensor || typeof command !== 'string') return false;

        // figure out the raw command after processing special methods, encryption, seq and client rate
        if (command.match(/^backdoor[, ](.*)$/)) { // if it is a backdoor directly set the command
            command = RegExp.$1;
            logger.log('executing ' + command);
        } else { // if not a backdoor handle seq number and encryption
            // for replay attacks
            sensor.commandToClient(command);

            if (sensor._hasValidEncryptionSet()) // if encryption is set
                command = sensor.decrypt(command);

            var seqNum = -1;
            if (command.match(/^(\d+)[, ](.*)$/)) {
                seqNum = +RegExp.$1;
                command = RegExp.$2;
            }
            if (!sensor.accepts(this.caller.clientId, seqNum)) {
                return false;
            }
            sensor.setSeqNum(seqNum);
        }

        return sensor.onCommand(command);
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
        var mac_addr = message.toString('hex', 0, 6); // pull out the mac address
        var sensor = SalIO.prototype._getOrCreateSensor(
            mac_addr, remote.address, remote.port);
        sensor.onMessage(message);
    }
});

/* eslint no-console: off */
if (process.env.SALIO_PORT) {
    console.log('SALIO_PORT is ' + process.env.SALIO_PORT);
    server.bind(process.env.SALIO_PORT || 1975);

    setTimeout(SalIO.prototype._heartbeat, 1000);
}

SalIO.isSupported = function () {
    if (!process.env.SALIO_PORT) {
        console.log('SALIO_PORT is not set (to 1975), SalIO is disabled');
    }
    return !!process.env.SALIO_PORT;
};

module.exports = SalIO;

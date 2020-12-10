/**
 * SalIO is meant to be used with the SalIO app for android.
 * It allows your android device to be used as a sensor which is accessible from inside Netsblox.
 * 
 * @alpha
 * @service
 */

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
var dgram = require('dgram'),
    server = dgram.createSocket('udp4'),
    SALIO_MODE = process.env.SALIO_MODE || 'both';

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
 * Returns the addresses of all authorized sensors.
 * @returns {array}
 */
SalIO.prototype.getSensors = async function () {
    const availableSensors = Object.keys(this._sensors);
    let sensors = await acl.authorizedRobots(this.caller.username, availableSensors);
    return sensors;
};

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
     * Gets the current accelerometer output from the sensor.
     * This is a 3D vector with units of m/s².
     * @param {string} sensor name of the sensor (matches at the end)
     */
    SalIO.prototype.getAccelerometer = function (sensor) {
        return this._passToSensor('getAccelerometer', arguments);
    };
    /**
     * As getAccelerometer, but scaled to a magnitude of 1.
     * @param {string} sensor name of the sensor (matches at the end)
     */
    SalIO.prototype.getAccelerometerNormalized = function (sensor) {
        return this._passToSensor('getAccelerometerNormalized', arguments);
    };
    /**
     * Gets a string representation of the general orientation of the device based on the accelerometer output.
     * In general, the values represent the direction the screen is facing. Possible values:
     *     "up" - the device (screen) is facing up.
     *     "down" - the device is facing down.
     *     "vertical" - the device is upright.
     *     "upside down" - the device is vertical, but upside down.
     *     "left" - the device is horizontal, lying on its left side (facing the screen).
     *     "right" - the device is horizontal, lying on its right side (facing the screen).
     * @param {string} sensor name of the sensor (matches at the end)
     */
    SalIO.prototype.getFacingDirection = function (sensor) {
        return this._passToSensor('getFacingDirection', arguments);
    };

    /**
     * Gets the current output of the gravity vector sensor.
     * This is a 3D vector with units of m/s².
     * This is similar to the Accelerometer, but tries to account for noise from linear movement.
     * If the device does not support this sensor, returns (0, 0, 0).
     * @param {string} sensor name of the sensor (matches at the end)
     */
    SalIO.prototype.getGravity = function (sensor) {
        return this._passToSensor('getGravity', arguments);
    };
    /**
     * As getGravity, but scaled to a magnitude of 1.
     * @param {string} sensor name of the sensor (matches at the end)
     */
    SalIO.prototype.getGravityNormalized = function (sensor) {
        return this._passToSensor('getGravityNormalized', arguments);
    };

    /**
     * Gets the current output of the linear acceleration sensor.
     * This is a 3D vector with units of m/s².
     * If the device does not support this sensor, returns (0, 0, 0).
     * @param {string} sensor name of the sensor (matches at the end)
     */
    SalIO.prototype.getLinearAcceleration = function (sensor) {
        return this._passToSensor('getLinearAcceleration', arguments);
    };
    /**
     * As getLinearAcceleration, but scaled to a magnitude of 1.
     * @param {string} sensor name of the sensor (matches at the end)
     */
    SalIO.prototype.getLinearAccelerationNormalized = function (sensor) {
        return this._passToSensor('getLinearAccelerationNormalized', arguments);
    };

    /**
     * Gets the current output of the gyroscope, which measures rotational acceleration.
     * This is a 3D vector with units of rad/s² around each axis.
     * If the device does not support this sensor, returns (0, 0, 0).
     * @param {string} sensor name of the sensor (matches at the end)
     */
    SalIO.prototype.getGyroscope = function (sensor) {
        return this._passToSensor('getGyroscope', arguments);
    };
    /**
     * Gets the current output of the rotation sensor, which measures rotational orientation.
     * This is a 4D vector with units of rad around each of the 3 axes, plus a scalar component.
     * For most uses, getGameRotation is more convenient.
     * If the device does not support this sensor, returns (0, 0, 0).
     * @param {string} sensor name of the sensor (matches at the end)
     */
    SalIO.prototype.getRotation = function (sensor) {
        return this._passToSensor('getRotation', arguments);
    };
    /**
     * Gets the current output of the game rotation sensor, which measures rotational orientation.
     * This is a 3D vector with units of rad around each axis from some standard basis.
     * Due to the arbitrary basis of getRotation, this is more appropriate for use in games.
     * If the device does not support this sensor, returns (0, 0, 0).
     * @param {string} sensor name of the sensor (matches at the end)
     */
    SalIO.prototype.getGameRotation = function (sensor) {
        return this._passToSensor('getGameRotation', arguments);
    };

    /**
     * Gets the current output of the magnetic field sensor.
     * This is a 3D vector with units of μT (micro teslas) in each direction.
     * If the device does not support this sensor, returns (0, 0, 0).
     * @param {string} sensor name of the sensor (matches at the end)
     */
    SalIO.prototype.getMagneticFieldVector = function (sensor) {
        return this._passToSensor('getMagneticFieldVector', arguments);
    };
    /**
     * As getMagneticFieldVector, but scaled to a magnitude of 1.
     * @param {string} sensor name of the sensor (matches at the end)
     */
    SalIO.prototype.getMagneticFieldVectorNormalized = function (sensor) {
        return this._passToSensor('getMagneticFieldVectorNormalized', arguments);
    };

    /**
     * Gets the current output of the proximity sensor.
     * This is a distance measured in cm.
     * Note that some devices only have binary proximity sensors (near/far), which will take discrete two values.
     * If the device does not have a proximity sensor, returns 0.
     * @param {string} sensor name of the sensor (matches at the end)
     */
    SalIO.prototype.getProximity = function (sensor) {
        return this._passToSensor('getProximity', arguments);
    };
    /**
     * Gets the current output of the step counter.
     * This measures the number of steps taken since the device was started.
     * If the device does not have a step counter, returns 0.
     * @param {string} sensor name of the sensor (matches at the end)
     */
    SalIO.prototype.getStepCount = function (sensor) {
        return this._passToSensor('getStepCount', arguments);
    };
    /**
     * gets the current output of the light sensor.
     * If the device does not have a light level sensor, returns 0.
     * @param {string} sensor name of the sensor (matches at the end)
     */
    SalIO.prototype.getLightLevel = function (sensor) {
        return this._passToSensor('getLightLevel', arguments);
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

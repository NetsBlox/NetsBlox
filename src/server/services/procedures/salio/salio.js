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

const {PromiseSocket} = require('promise-socket');

const logger = require('../utils/logger')('SalIO');
const Sensor = require('./sensor');
const acl = require('../roboscape/accessControl');
const common = require('./common');
var dgram = require('dgram'),
    server = dgram.createSocket('udp4'),
    SALIO_MODE = process.env.SALIO_MODE || 'both';

const SALIO_TCP_PORT = 8889; // tcp port used by the SalIO app

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

/**
 * Get the color code for the specified red green and blue levels.
 * @param {BoundedNumber<0, 255>} red red level (0-255).
 * @param {BoundedNumber<0, 255>} green green level (0-255).
 * @param {BoundedNumber<0, 255>} blue blue level (0-255).
 * @returns {boolean} The orientation angles relative to the Earth's magnetic field.
 */
SalIO.prototype.getColor = function (red, green, blue) {
    return 0xff000000 | ((red & 0xff) << 16) | ((green & 0xff) << 8) | (blue & 0xff);
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
     * Checks for successful authentication.
     * @param {string} sensor name of the sensor (matches at the end)
     * @param {string} password current password for the sensor
     * @returns {boolean} True if authentication is successful, otherwise false.
     */
    SalIO.prototype.authenticate = function (sensor, password) {
        return this._passToSensor('authenticate', arguments);
    };
    /**
     * Clears all custom controls from the device.
     * @param {string} sensor name of the sensor (matches at the end)
     * @param {string} password current password for the sensor
     * @returns {boolean} True if the action is successful, false otherwise.
     */
    SalIO.prototype.clearControls = function (sensor, password) {
        return this._passToSensor('clearControls', arguments);
    };
    /**
     * Removes the specified custom control from the device (if it exists).
     * @param {string} sensor name of the sensor (matches at the end)
     * @param {string} password current password for the sensor
     * @param {String} id name of the control to remove.
     * @returns {boolean} True if the action is successful, false otherwise.
     */
    SalIO.prototype.removeControl = function (sensor, password) {
        return this._passToSensor('removeControl', arguments);
    };
    /**
     * Add a custom button to the device.
     * @param {string} sensor name of the sensor (matches at the end)
     * @param {string} password current password for the sensor
     * @param {BoundedNumber<0, 100>} x X position of the top left corner of the button (percentage).
     * @param {BoundedNumber<0, 100>} y Y position of the top left corner of the button (percentage).
     * @param {BoundedNumber<0, 100>} width Width of the button (percentage).
     * @param {BoundedNumber<0, 100>} height Height of the button (percentage).
     * @param {Number=} color Color code of the button itself (defaults to light blue).
     * @param {Number=} textColor Color code of the button text (if any) (defaults to white).
     * @param {String} id Name of the button.
     * @param {String} event Name of the event to fire when the button is pressed.
     * @param {string} text The text to display on the button
     * @returns {boolean} True if the action is successful, false otherwise.
     */
    SalIO.prototype.addButton = function (sensor, password, x, y, width, height, color=this.getColor(66, 135, 245), textColor=this.getColor(255, 255, 255), id, event, text) {
        arguments[6] = color;
        arguments[7] = textColor;
        return this._passToSensor('addButton', arguments);
    };
    /**
     * Add a custom text field to the device.
     * @param {string} sensor name of the sensor (matches at the end)
     * @param {string} password current password for the sensor
     * @param {BoundedNumber<0, 100>} x X position of the top left corner of the text field (percentage).
     * @param {BoundedNumber<0, 100>} y Y position of the top left corner of the text field (percentage).
     * @param {BoundedNumber<0, 100>} width Width of the text field (percentage).
     * @param {BoundedNumber<0, 100>} height Height of the text field (percentage).
     * @param {Number=} color Color code of the text field itself (defaults to light blue).
     * @param {Number=} textColor Color code of the text field's text (if any) (defaults to black).
     * @param {String} id Name of the text field.
     * @param {String} event Name of the event to fire when the text field content is changed by the user.
     * @param {string} text The initial text to display
     * @returns {boolean} True if the action is successful, false otherwise.
     */
    SalIO.prototype.addTextField = function (sensor, password, x, y, width, height, color=this.getColor(66, 135, 245), textColor=this.getColor(0, 0, 0), id, event, text) {
        arguments[6] = color;
        arguments[7] = textColor;
        return this._passToSensor('addTextField', arguments);
    };
    /**
     * Add a custom checkbox to the device.
     * @param {string} sensor name of the sensor (matches at the end)
     * @param {string} password current password for the sensor
     * @param {BoundedNumber<0, 100>} x X position of the top left corner of the button (percentage).
     * @param {BoundedNumber<0, 100>} y Y position of the top left corner of the button (percentage).
     * @param {Number=} checkColor Color code of the check box itself (defaults to light blue).
     * @param {Number=} textColor Color code of the text (if any) (defaults to black).
     * @param {bool=} state Initial check state of the checkbox (defaults to false).
     * @param {String} id Name of the checkbox.
     * @param {String} event Name of the event to fire when the button is pressed.
     * @param {string} text The text to display next to the checkbox
     * @returns {boolean} True if the action is successful, false otherwise.
     */
    SalIO.prototype.addCheckbox = function (sensor, password, x, y, checkColor=this.getColor(66, 135, 245), textColor=this.getColor(0, 0, 0), state=false, id, event, text) {
        arguments[4] = checkColor;
        arguments[5] = textColor;
        return this._passToSensor('addCheckbox', arguments);
    };
    /**
     * Add a custom toggle switch to the device, functionally equivalent to a checkbox but styled as a switch.
     * @param {string} sensor name of the sensor (matches at the end)
     * @param {string} password current password for the sensor
     * @param {BoundedNumber<0, 100>} x X position of the top left corner of the button (percentage).
     * @param {BoundedNumber<0, 100>} y Y position of the top left corner of the button (percentage).
     * @param {Number=} checkColor Color code of the check box itself (defaults to light blue).
     * @param {Number=} textColor Color code of the text (if any) (defaults to black).
     * @param {bool=} state Initial check state of the toggle switch (defaults to false).
     * @param {String} id name of the toggle switch
     * @param {String} event name of the event to raise for click events
     * @param {string} text The text to display next to the toggle switch
     * @returns {boolean} True if the action is successful, false otherwise.
     */
    SalIO.prototype.addToggleswitch = function (sensor, password, x, y, checkColor=this.getColor(66, 135, 245), textColor=this.getColor(0, 0, 0), state=false, id, event, text) {
        arguments[4] = checkColor;
        arguments[5] = textColor;
        return this._passToSensor('addToggleswitch', arguments);
    };
    /**
     * Add a custom radio button to the device.
     * A radio button is like a checkbox, but they are arranged into groups.
     * Only one radio button in each group may be checked.
     * @param {string} sensor name of the sensor (matches at the end)
     * @param {string} password current password for the sensor
     * @param {BoundedNumber<0, 100>} x X position of the top left corner of the button (percentage).
     * @param {BoundedNumber<0, 100>} y Y position of the top left corner of the button (percentage).
     * @param {Number=} checkColor Color code of the check box itself (defaults to light blue).
     * @param {Number=} textColor Color code of the text (if any) (defaults to black).
     * @param {bool=} state Initial check state of the radio button (defaults to false) - All false in a group is OK, but you should avoid setting multiple explicitly to true.
     * @param {String} id name of the radio button
     * @param {String} group name of the group (only one radio button in each group can be selected by the user)
     * @param {String} event name of the event to raise for click events
     * @param {string} text The text to display next to the checkbox
     * @returns {boolean} True if the action is successful, false otherwise.
     */
    SalIO.prototype.addRadioButton = function (sensor, password, x, y, checkColor=this.getColor(66, 135, 245), textColor=this.getColor(0, 0, 0), state=false, id, group, event, text) {
        arguments[4] = checkColor;
        arguments[5] = textColor;
        return this._passToSensor('addRadioButton', arguments);
    };
    /**
     * Add a custom label to the device.
     * Labels are similar to buttons except they cannot be clicked.
     * @param {string} sensor name of the sensor (matches at the end)
     * @param {string} password current password for the sensor
     * @param {BoundedNumber<0, 100>} x X position of the top left corner of the button (percentage).
     * @param {BoundedNumber<0, 100>} y Y position of the top left corner of the button (percentage).
     * @param {Number=} textColor Color code of the button text (if any) (defaults to black).
     * @param {String} id Name of the label
     * @param {string} text The text to display on the button
     * @returns {boolean} True if the action is successful, false otherwise.
     */
    SalIO.prototype.addLabel = function (sensor, password, x, y, textColor=this.getColor(0, 0, 0), id, text) {
        arguments[4] = textColor;
        return this._passToSensor('addLabel', arguments);
    };
    /**
     * Begin listening for GUI events such as button presses.
     * @param {string} sensor name of the sensor (matches at the end)
     * @param {string} password current password for the sensor
     * @returns {boolean} True if the action is successful, false otherwise.
     */
    SalIO.prototype.guiListen = async function (sensor, password) {
        const _sensor = await this._getSensor(sensor);
        if (!_sensor) throw new Error('failed to connect to sensor');
        await _sensor.authenticate(_sensor, [password]); // throws on failure - we want this

        _sensor.guiListeners[this.socket.clientId] = this.socket;
        return true;
    };

    /**
     * Gets the toggle state of any toggleable custom control.
     * @param {string} sensor name of the sensor (matches at the end)
     * @param {string} password current password for the sensor
     * @param {String} id name of the toggleable control to read
     * @returns {boolean} True or False, depending on the toggle state
     */
    SalIO.prototype.getToggleState = function (sensor, password, id) {
        return this._passToSensor('getToggleState', arguments);
    };

    /**
     * Get the orientation of the device relative to the Earth's magnetic reference frame.
     * This is returned as a list of 3 values:
     * 1. The azimuth angle, effectively the compass heading [-pi, pi].
     * 2. The pitch (vertical tilt) angle [-pi/2, pi/2].
     * 3. The roll angle [-pi/2,pi/2].
     * @param {string} sensor name of the sensor (matches at the end)
     * @param {string} password current password for the sensor
     * @returns {Array} The orientation angles relative to the Earth's magnetic field.
     */
    SalIO.prototype.getOrientation = function (sensor, password) {
        return this._passToSensor('getOrientation', arguments);
    };
    /**
     * Get the compass heading in radians [-pi, pi].
     * @param {string} sensor name of the sensor (matches at the end)
     * @param {string} password current password for the sensor
     * @returns {Number} The compass heading in radians.
     */
    SalIO.prototype.getCompassHeading = function (sensor, password) {
        return this._passToSensor('getCompassHeading', arguments);
    };
    /**
     * Get the compass heading in degrees [-180, 180].
     * @param {string} sensor name of the sensor (matches at the end)
     * @param {string} password current password for the sensor
     * @returns {Number} The compass heading in radians.
     */
    SalIO.prototype.getCompassHeadingDegrees = async function (sensor, password) {
        return this._passToSensor('getCompassHeadingDegrees', arguments);
    };
    /**
     * Get the name of the closest compass direction (N, NE, E, SE, etc.).
     * @param {string} sensor name of the sensor (matches at the end)
     * @param {string} password current password for the sensor
     * @returns {String} The compass direction name
     */
    SalIO.prototype.getCompassDirection = function (sensor, password) {
        return this._passToSensor('getCompassDirection', arguments);
    };
    /**
     * Get the name of the closest compass cardinal direction (N, E, S, W).
     * @param {string} sensor name of the sensor (matches at the end)
     * @param {string} password current password for the sensor
     * @returns {String} The compass cardinal direction name
     */
    SalIO.prototype.getCompassCardinalDirection = function (sensor, password) {
        return this._passToSensor('getCompassCardinalDirection', arguments);
    };

    /**
     * Get the current accelerometer output from the sensor.
     * This is a 3D vector with units of m/s².
     * @param {string} sensor name of the sensor (matches at the end)
     * @param {string} password current password for the sensor
     * @returns {Array} accelerometer output
     */
    SalIO.prototype.getAccelerometer = function (sensor, password) {
        return this._passToSensor('getAccelerometer', arguments);
    };
    /**
     * As getAccelerometer, but scaled to a magnitude of 1.
     * @param {string} sensor name of the sensor (matches at the end)
     * @param {string} password current password for the sensor
     * @returns {Array} accelerometer output, with magnitude 1
     */
    SalIO.prototype.getAccelerometerNormalized = function (sensor, password) {
        return this._passToSensor('getAccelerometerNormalized', arguments);
    };
    /**
     * Get a string representation of the general orientation of the device based on the accelerometer output.
     * In general, the values represent the direction the screen is facing. Possible values:
     *     "up" - the device (screen) is facing up.
     *     "down" - the device is facing down.
     *     "vertical" - the device is upright.
     *     "upside down" - the device is vertical, but upside down.
     *     "left" - the device is horizontal, lying on its left side (facing the screen).
     *     "right" - the device is horizontal, lying on its right side (facing the screen).
     * @param {string} sensor name of the sensor (matches at the end)
     * @param {string} password current password for the sensor
     * @returns {string} name of facing direction
     */
    SalIO.prototype.getFacingDirection = function (sensor, password) {
        return this._passToSensor('getFacingDirection', arguments);
    };

    /**
     * Get the current output of the gravity vector sensor.
     * This is a 3D vector with units of m/s².
     * This is similar to the Accelerometer, but tries to account for noise from linear movement.
     * @param {string} sensor name of the sensor (matches at the end)
     * @param {string} password current password for the sensor
     * @returns {Array} output of gravity sensor
     */
    SalIO.prototype.getGravity = function (sensor, password) {
        return this._passToSensor('getGravity', arguments);
    };
    /**
     * As getGravity, but scaled to a magnitude of 1.
     * @param {string} sensor name of the sensor (matches at the end)
     * @param {string} password current password for the sensor
     * @returns {Array} output of gravity sensor, with magnitude 1
     */
    SalIO.prototype.getGravityNormalized = function (sensor, password) {
        return this._passToSensor('getGravityNormalized', arguments);
    };

    /**
     * Get the current output of the linear acceleration sensor.
     * This is a 3D vector with units of m/s².
     * @param {string} sensor name of the sensor (matches at the end)
     * @param {string} password current password for the sensor
     * @returns {Array} linear acceleration vector
     */
    SalIO.prototype.getLinearAcceleration = function (sensor, password) {
        return this._passToSensor('getLinearAcceleration', arguments);
    };
    /**
     * As getLinearAcceleration, but scaled to a magnitude of 1.
     * @param {string} sensor name of the sensor (matches at the end)
     * @param {string} password current password for the sensor
     * @returns {Array} linear acceleration vector, with magnitude 1
     */
    SalIO.prototype.getLinearAccelerationNormalized = function (sensor, password) {
        return this._passToSensor('getLinearAccelerationNormalized', arguments);
    };

    /**
     * Get the current output of the gyroscope, which measures rotational acceleration.
     * This is a 3D vector with units of rad/s² around each axis.
     * @param {string} sensor name of the sensor (matches at the end)
     * @param {string} password current password for the sensor
     * @returns {Array} output of gyroscope
     */
    SalIO.prototype.getGyroscope = function (sensor, password) {
        return this._passToSensor('getGyroscope', arguments);
    };
    /**
     * Get the current output of the rotation sensor, which measures rotational orientation.
     * This is a 4D vector with units of rad around each of the 3 axes, plus a scalar component.
     * For most uses, getGameRotation is more convenient.
     * @param {string} sensor name of the sensor (matches at the end)
     * @param {string} password current password for the sensor
     * @returns {Array} 4D rotational vector
     */
    SalIO.prototype.getRotation = function (sensor, password) {
        return this._passToSensor('getRotation', arguments);
    };
    /**
     * Get the current output of the game rotation sensor, which measures rotational orientation.
     * This is a 3D vector with units of rad around each axis from some standard basis.
     * Due to the arbitrary basis of getRotation, this is more appropriate for use in games.
     * If the device does not support this sensor, returns (0, 0, 0).
     * @param {string} sensor name of the sensor (matches at the end)
     * @param {string} password current password for the sensor
     * @returns {Array} 3D rotational vector
     */
    SalIO.prototype.getGameRotation = function (sensor, password) {
        return this._passToSensor('getGameRotation', arguments);
    };

    /**
     * Get the current output of the magnetic field sensor.
     * This is a 3D vector with units of μT (micro teslas) in each direction.
     * If the device does not support this sensor, returns (0, 0, 0).
     * @param {string} sensor name of the sensor (matches at the end)
     * @param {string} password current password for the sensor
     * @returns {Array} magnetic field vector
     */
    SalIO.prototype.getMagneticFieldVector = function (sensor, password) {
        return this._passToSensor('getMagneticFieldVector', arguments);
    };
    /**
     * As getMagneticFieldVector, but scaled to a magnitude of 1.
     * @param {string} sensor name of the sensor (matches at the end)
     * @param {string} password current password for the sensor
     * @returns {Array} magnetic field vector, with magnitude 1
     */
    SalIO.prototype.getMagneticFieldVectorNormalized = function (sensor, password) {
        return this._passToSensor('getMagneticFieldVectorNormalized', arguments);
    };

    /**
     * Get the volume level from the device's microphone.
     * @param {string} sensor name of the sensor (matches at the end)
     * @param {string} password current password for the sensor
     * @returns {Array} A number representing the volume detected by the microphone.
     */
    SalIO.prototype.getMicrophoneLevel = function (sensor, password) {
        return this._passToSensor('getMicrophoneLevel', arguments);
    };

    /**
     * Get the current location of the device.
     * This is a latitude longitude pair in degrees.
     * If the device does not have location enabled, returns (0, 0).
     * @param {string} sensor name of the sensor (matches at the end)
     * @param {string} password current password for the sensor
     * @returns {Array} latitude and longitude
     */
    SalIO.prototype.getLocation = function (sensor, password) {
        return this._passToSensor('getLocation', arguments);
    };

    /**
     * Get the current output of the proximity sensor.
     * This is a distance measured in cm.
     * Note that some devices only have binary proximity sensors (near/far), which will take discrete two values.
     * If the device does not have a proximity sensor, returns 0.
     * @param {string} sensor name of the sensor (matches at the end)
     * @param {string} password current password for the sensor
     * @returns {Number} distance from proximity sensor in cm
     */
    SalIO.prototype.getProximity = function (sensor, password) {
        return this._passToSensor('getProximity', arguments);
    };
    /**
     * Get the current output of the step counter.
     * This measures the number of steps taken since the device was started.
     * If the device does not have a step counter, returns 0.
     * @param {string} sensor name of the sensor (matches at the end)
     * @param {string} password current password for the sensor
     * @returns {Number} number of steps taken
     */
    SalIO.prototype.getStepCount = function (sensor, password) {
        return this._passToSensor('getStepCount', arguments);
    };
    /**
     * Get the current output of the light sensor.
     * If the device does not have a light level sensor, returns 0.
     * @param {string} sensor name of the sensor (matches at the end)
     * @param {string} password current password for the sensor
     * @returns {Number} current light level reading
     */
    SalIO.prototype.getLightLevel = function (sensor, password) {
        return this._passToSensor('getLightLevel', arguments);
    };

    /**
     * Get the most recent image snapshot from the sensor.
     * @param {string} sensor name of the sensor (matches at the end)
     * @param {string} password current password for the sensor
     */
    SalIO.prototype.getImage = async function (sensor, password) {
        const sensorObj = await this._getSensor(sensor);
        if (sensorObj === undefined) return false; // false simulates other RPC failures
        const ip = sensorObj.ip4_addr;

        const msg = Buffer.alloc(9);
        msg.write('D', 0, 1);
        msg.writeBigInt64BE(common.gracefullPasswordParse(password), 1);

        const socket = new PromiseSocket();
        socket.setTimeout(5000); // allow some time for starting connection and encoding result (well over worst case)
        try {
            await socket.connect(SALIO_TCP_PORT, ip);
            await socket.writeAll(msg);
            const bin = await socket.readAll();
            if (bin.length === 0) throw 0; // failed request, return the default error message

            const rsp = this.response;
            rsp.set('content-type', 'image/jpeg');
            rsp.set('content-length', bin.length);
            rsp.set('connection', 'close');
            return rsp.status(200).send(bin);
        }
        catch (err) {
            throw new Error('get image not enabled or failed to auth');
        }
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

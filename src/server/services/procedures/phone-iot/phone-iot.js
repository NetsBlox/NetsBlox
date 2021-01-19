/**
 * PhoneIoT is meant to be used with the PhoneIoT app for android.
 * It allows your android device to be used as an sensor and input device accessible from inside Netsblox.
 * 
 * @alpha
 * @service
 */

/*
 * Based on the RoboScape procedure.
 *
 * Environment variables:
 *  PHONE_IOT_PORT: set it to the UDP port (1975) to enable this module
 *  PHONE_IOT_MODE: sets the NetsBlox interface type, can be "security",
 *      "native" or "both" (default)
 */

'use strict';

const logger = require('../utils/logger')('PhoneIoT');
const Device = require('./device');
const acl = require('../roboscape/accessControl');
var dgram = require('dgram'),
    server = dgram.createSocket('udp4'),
    PHONE_IOT_MODE = process.env.PHONE_IOT_MODE || 'both';

/*
 * PhoneIoT - This constructor is called on the first
 * request to an RPC from a given room.
 * @constructor
 * @return {undefined}
 */
var PhoneIoT = function () {
    this._state = {
        registered: {}
    };
};

PhoneIoT.serviceName = 'PhoneIoT';
// keeps a dictionary of device objects keyed by mac_addr
PhoneIoT.prototype._devices = {};

PhoneIoT.prototype._ensureLoggedIn = function() {
    if (this.caller.username !== undefined)
        throw new Error('Login required.');
};

// fetch the device and updates its address. creates one if necessary
PhoneIoT.prototype._getOrCreateDevice = function (mac_addr, ip4_addr, ip4_port) {
    var device = this._devices[mac_addr];
    if (!device) {
        logger.log('discovering ' + mac_addr + ' at ' + ip4_addr + ':' + ip4_port);
        device = new Device(mac_addr, ip4_addr, ip4_port, server);
        this._devices[mac_addr] = device;
    } else {
        device.updateAddress(ip4_addr, ip4_port);
    }
    return device;
};

// find the device object based on the partial id or returns undefined
PhoneIoT.prototype._getDevice = async function (deviceId) {
    deviceId = '' + deviceId;
    let device;

    if (deviceId.length < 4) throw Error('id too short');
    if (deviceId.length > 12) throw Error('id too long');

    // autocomplete the deviceId and find the device object
    if (deviceId.length === 12) {
        device = this._devices[deviceId];
    } else { // try to guess the rest of the id
        for (var mac_addr in this._devices) { // pick the first match
            if (mac_addr.endsWith(deviceId)) {
                deviceId = mac_addr;
                device = this._devices[deviceId];
            }
        }
    }

    // if couldn't find a live device
    if (!device) throw Error('device not found');

    await acl.ensureAuthorized(this.caller.username, deviceId);
    return device;
};

PhoneIoT.prototype._heartbeat = function () {
    for (var mac_addr in PhoneIoT.prototype._devices) {
        var device = PhoneIoT.prototype._devices[mac_addr];
        if (!device.heartbeat()) {
            logger.log('forgetting ' + mac_addr);
            delete PhoneIoT.prototype._devices[mac_addr];
        }
    }
    setTimeout(PhoneIoT.prototype._heartbeat, 1000);
};

/**
 * Returns the MAC addresses of the registered devices for this client.
 * @returns {array} the list of registered devices
 */
PhoneIoT.prototype._getRegistered = function () {
    var state = this._state,
        devices = [];
    for (var mac_addr in state.registered) {
        if (this._devices[mac_addr].isMostlyAlive()) {
            devices.push(mac_addr);
        } else {
            delete state.registered[mac_addr];
        }
    }
    return devices;
};

/**
 * Returns the addresses of all authorized devices.
 * @returns {array}
 */
PhoneIoT.prototype.getDevices = async function () {
    const availableDevices = Object.keys(this._devices);
    let devices = await acl.authorizedRobots(this.caller.username, availableDevices);
    return devices;
};

/**
 * Performs the pre-checks and maps the incoming call to a device action.
 * @param {String} fnName name of the method/function to call on the device object
 * @param {Array} args array of arguments
 */
PhoneIoT.prototype._passToDevice = async function (fnName, args) {
    args = Array.from(args);
    let deviceId = args.shift();
    const device = await this._getDevice(deviceId);
    if (device.accepts(this.caller.clientId)) {
        let rv = device[fnName](device, args);
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
 * @returns {Number} Constructed color code
 */
PhoneIoT.prototype.getColor = function (red, green, blue) {
    return 0xff000000 | ((red & 0xff) << 16) | ((green & 0xff) << 8) | (blue & 0xff);
};

if (PHONE_IOT_MODE === 'native' || PHONE_IOT_MODE === 'both') {
    /* eslint-disable no-unused-vars */
    /**
     * Returns true if the given device is alive, sent messages in the
     * last two seconds.
     * @param {string} device name of the device (matches at the end)
     * @returns {boolean} True if the device is alive
     */
    PhoneIoT.prototype.isAlive = function (device) {
        return this._passToDevice('isAlive', arguments);
    };

    /**
     * Checks for successful authentication.
     * @param {string} device name of the device (matches at the end)
     * @param {string} password current password for the device
     * @returns {boolean} True if authentication is successful, otherwise false.
     */
    PhoneIoT.prototype.authenticate = function (device, password) {
        return this._passToDevice('authenticate', arguments);
    };
    /**
     * Clears all custom controls from the device.
     * @param {string} device name of the device (matches at the end)
     * @param {string} password current password for the device
     * @returns {boolean} True if the action is successful, false otherwise.
     */
    PhoneIoT.prototype.clearControls = function (device, password) {
        return this._passToDevice('clearControls', arguments);
    };
    /**
     * Removes the specified custom control from the device (if it exists).
     * @param {string} device name of the device (matches at the end)
     * @param {string} password current password for the device
     * @param {String} id name of the control to remove.
     * @returns {boolean} True if the action is successful, false otherwise.
     */
    PhoneIoT.prototype.removeControl = function (device, password, id) {
        return this._passToDevice('removeControl', arguments);
    };
    /**
     * Add a custom button to the device.
     * @param {string} device name of the device (matches at the end)
     * @param {string} password current password for the device
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
    PhoneIoT.prototype.addButton = function (device, password, x, y, width, height, color=this.getColor(66, 135, 245), textColor=this.getColor(255, 255, 255), id, event, text) {
        arguments[6] = color;
        arguments[7] = textColor;
        return this._passToDevice('addButton', arguments);
    };
    /**
     * Add a custom image display to the device, which is initially empty.
     * @param {string} device name of the device (matches at the end)
     * @param {string} password current password for the device
     * @param {BoundedNumber<0, 100>} x X position of the top left corner of the image box (percentage).
     * @param {BoundedNumber<0, 100>} y Y position of the top left corner of the image box (percentage).
     * @param {BoundedNumber<0, 100>} width Width of the image box (percentage).
     * @param {BoundedNumber<0, 100>} height Height of the image box (percentage).
     * @param {String} id Name of the image box.
     * @param {String} event Name of the event to fire when the image box content is changed by the user.
     * @returns {boolean} True if the action is successful, false otherwise.
     */
    PhoneIoT.prototype.addImageDisplay = function (device, password, x, y, width, height, id, event) {
        return this._passToDevice('addImageDisplay', arguments);
    };
    /**
     * Add a custom text field to the device.
     * @param {string} device name of the device (matches at the end)
     * @param {string} password current password for the device
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
    PhoneIoT.prototype.addTextField = function (device, password, x, y, width, height, color=this.getColor(66, 135, 245), textColor=this.getColor(0, 0, 0), id, event, text) {
        arguments[6] = color;
        arguments[7] = textColor;
        return this._passToDevice('addTextField', arguments);
    };
    /**
     * Add a custom checkbox to the device.
     * @param {string} device name of the device (matches at the end)
     * @param {string} password current password for the device
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
    PhoneIoT.prototype.addCheckbox = function (device, password, x, y, checkColor=this.getColor(66, 135, 245), textColor=this.getColor(0, 0, 0), state=false, id, event, text) {
        arguments[4] = checkColor;
        arguments[5] = textColor;
        return this._passToDevice('addCheckbox', arguments);
    };
    /**
     * Add a custom toggle switch to the device, functionally equivalent to a checkbox but styled as a switch.
     * @param {string} device name of the device (matches at the end)
     * @param {string} password current password for the device
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
    PhoneIoT.prototype.addToggleswitch = function (device, password, x, y, checkColor=this.getColor(66, 135, 245), textColor=this.getColor(0, 0, 0), state=false, id, event, text) {
        arguments[4] = checkColor;
        arguments[5] = textColor;
        return this._passToDevice('addToggleswitch', arguments);
    };
    /**
     * Add a custom radio button to the device.
     * A radio button is like a checkbox, but they are arranged into groups.
     * Only one radio button in each group may be checked.
     * @param {string} device name of the device (matches at the end)
     * @param {string} password current password for the device
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
    PhoneIoT.prototype.addRadioButton = function (device, password, x, y, checkColor=this.getColor(66, 135, 245), textColor=this.getColor(0, 0, 0), state=false, id, group, event, text) {
        arguments[4] = checkColor;
        arguments[5] = textColor;
        return this._passToDevice('addRadioButton', arguments);
    };
    /**
     * Add a custom label to the device.
     * Labels are similar to buttons except they cannot be clicked.
     * @param {string} device name of the device (matches at the end)
     * @param {string} password current password for the device
     * @param {BoundedNumber<0, 100>} x X position of the top left corner of the button (percentage).
     * @param {BoundedNumber<0, 100>} y Y position of the top left corner of the button (percentage).
     * @param {Number=} textColor Color code of the button text (if any) (defaults to black).
     * @param {String} id Name of the label
     * @param {string} text The text to display on the button
     * @returns {boolean} True if the action is successful, false otherwise.
     */
    PhoneIoT.prototype.addLabel = function (device, password, x, y, textColor=this.getColor(0, 0, 0), id, text) {
        arguments[4] = textColor;
        return this._passToDevice('addLabel', arguments);
    };
    /**
     * Begin listening for events such as button presses.
     * @param {string} device name of the device (matches at the end)
     * @param {string} password current password for the device
     * @returns {boolean} True if the action is successful, false otherwise.
     */
    PhoneIoT.prototype.listen = async function (device, password) {
        const _device = await this._getDevice(device);
        await _device.authenticate(_device, [password]); // throws on failure - we want this

        _device.guiListeners[this.socket.clientId] = this.socket;
        return true;
    };

    /**
     * Gets the toggle state of any toggleable custom control.
     * @param {string} device name of the device (matches at the end)
     * @param {string} password current password for the device
     * @param {String} id name of the toggleable control to read
     * @returns {boolean} True or False, depending on the toggle state
     */
    PhoneIoT.prototype.getToggleState = function (device, password, id) {
        return this._passToDevice('getToggleState', arguments);
    };

    /**
     * Get the orientation of the device relative to the Earth's magnetic reference frame.
     * This is returned as a list of 3 values:
     * 1. The azimuth angle, effectively the compass heading [-pi, pi].
     * 2. The pitch (vertical tilt) angle [-pi/2, pi/2].
     * 3. The roll angle [-pi/2,pi/2].
     * @param {string} device name of the device (matches at the end)
     * @param {string} password current password for the device
     * @returns {Array} The orientation angles relative to the Earth's magnetic field.
     */
    PhoneIoT.prototype.getOrientation = function (device, password) {
        return this._passToDevice('getOrientation', arguments);
    };
    /**
     * Get the compass heading in radians [-pi, pi].
     * @param {string} device name of the device (matches at the end)
     * @param {string} password current password for the device
     * @returns {Number} The compass heading in radians.
     */
    PhoneIoT.prototype.getCompassHeading = function (device, password) {
        return this._passToDevice('getCompassHeading', arguments);
    };
    /**
     * Get the compass heading in degrees [-180, 180].
     * @param {string} device name of the device (matches at the end)
     * @param {string} password current password for the device
     * @returns {Number} The compass heading in radians.
     */
    PhoneIoT.prototype.getCompassHeadingDegrees = async function (device, password) {
        return this._passToDevice('getCompassHeadingDegrees', arguments);
    };
    /**
     * Get the name of the closest compass direction (N, NE, E, SE, etc.).
     * @param {string} device name of the device (matches at the end)
     * @param {string} password current password for the device
     * @returns {String} The compass direction name
     */
    PhoneIoT.prototype.getCompassDirection = function (device, password) {
        return this._passToDevice('getCompassDirection', arguments);
    };
    /**
     * Get the name of the closest compass cardinal direction (N, E, S, W).
     * @param {string} device name of the device (matches at the end)
     * @param {string} password current password for the device
     * @returns {String} The compass cardinal direction name
     */
    PhoneIoT.prototype.getCompassCardinalDirection = function (device, password) {
        return this._passToDevice('getCompassCardinalDirection', arguments);
    };

    /**
     * Get the current accelerometer output from the device.
     * This is a 3D vector with units of m/s².
     * @param {string} device name of the device (matches at the end)
     * @param {string} password current password for the device
     * @returns {Array} accelerometer output
     */
    PhoneIoT.prototype.getAccelerometer = function (device, password) {
        return this._passToDevice('getAccelerometer', arguments);
    };
    /**
     * As getAccelerometer, but scaled to a magnitude of 1.
     * @param {string} device name of the device (matches at the end)
     * @param {string} password current password for the device
     * @returns {Array} accelerometer output, with magnitude 1
     */
    PhoneIoT.prototype.getAccelerometerNormalized = function (device, password) {
        return this._passToDevice('getAccelerometerNormalized', arguments);
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
     * @param {string} device name of the device (matches at the end)
     * @param {string} password current password for the device
     * @returns {string} name of facing direction
     */
    PhoneIoT.prototype.getFacingDirection = function (device, password) {
        return this._passToDevice('getFacingDirection', arguments);
    };

    /**
     * Get the current output of the gravity vector device.
     * This is a 3D vector with units of m/s².
     * This is similar to the Accelerometer, but tries to account for noise from linear movement.
     * @param {string} device name of the device (matches at the end)
     * @param {string} password current password for the device
     * @returns {Array} output of gravity device
     */
    PhoneIoT.prototype.getGravity = function (device, password) {
        return this._passToDevice('getGravity', arguments);
    };
    /**
     * As getGravity, but scaled to a magnitude of 1.
     * @param {string} device name of the device (matches at the end)
     * @param {string} password current password for the device
     * @returns {Array} output of gravity device, with magnitude 1
     */
    PhoneIoT.prototype.getGravityNormalized = function (device, password) {
        return this._passToDevice('getGravityNormalized', arguments);
    };

    /**
     * Get the current output of the linear acceleration device.
     * This is a 3D vector with units of m/s².
     * @param {string} device name of the device (matches at the end)
     * @param {string} password current password for the device
     * @returns {Array} linear acceleration vector
     */
    PhoneIoT.prototype.getLinearAcceleration = function (device, password) {
        return this._passToDevice('getLinearAcceleration', arguments);
    };
    /**
     * As getLinearAcceleration, but scaled to a magnitude of 1.
     * @param {string} device name of the device (matches at the end)
     * @param {string} password current password for the device
     * @returns {Array} linear acceleration vector, with magnitude 1
     */
    PhoneIoT.prototype.getLinearAccelerationNormalized = function (device, password) {
        return this._passToDevice('getLinearAccelerationNormalized', arguments);
    };

    /**
     * Get the current output of the gyroscope, which measures rotational acceleration.
     * This is a 3D vector with units of rad/s² around each axis.
     * @param {string} device name of the device (matches at the end)
     * @param {string} password current password for the device
     * @returns {Array} output of gyroscope
     */
    PhoneIoT.prototype.getGyroscope = function (device, password) {
        return this._passToDevice('getGyroscope', arguments);
    };
    /**
     * Get the current output of the rotation device, which measures rotational orientation.
     * This is a 4D vector with units of rad around each of the 3 axes, plus a scalar component.
     * For most uses, getGameRotation is more convenient.
     * @param {string} device name of the device (matches at the end)
     * @param {string} password current password for the device
     * @returns {Array} 4D rotational vector
     */
    PhoneIoT.prototype.getRotation = function (device, password) {
        return this._passToDevice('getRotation', arguments);
    };
    /**
     * Get the current output of the game rotation device, which measures rotational orientation.
     * This is a 3D vector with units of rad around each axis from some standard basis.
     * Due to the arbitrary basis of getRotation, this is more appropriate for use in games.
     * @param {string} device name of the device (matches at the end)
     * @param {string} password current password for the device
     * @returns {Array} 3D rotational vector
     */
    PhoneIoT.prototype.getGameRotation = function (device, password) {
        return this._passToDevice('getGameRotation', arguments);
    };

    /**
     * Get the current output of the magnetic field device.
     * This is a 3D vector with units of μT (micro teslas) in each direction.
     * @param {string} device name of the device (matches at the end)
     * @param {string} password current password for the device
     * @returns {Array} magnetic field vector
     */
    PhoneIoT.prototype.getMagneticFieldVector = function (device, password) {
        return this._passToDevice('getMagneticFieldVector', arguments);
    };
    /**
     * As getMagneticFieldVector, but scaled to a magnitude of 1.
     * @param {string} device name of the device (matches at the end)
     * @param {string} password current password for the device
     * @returns {Array} magnetic field vector, with magnitude 1
     */
    PhoneIoT.prototype.getMagneticFieldVectorNormalized = function (device, password) {
        return this._passToDevice('getMagneticFieldVectorNormalized', arguments);
    };

    /**
     * Get the volume level from the device's microphone.
     * @param {string} device name of the device (matches at the end)
     * @param {string} password current password for the device
     * @returns {Array} A number representing the volume detected by the microphone.
     */
    PhoneIoT.prototype.getMicrophoneLevel = function (device, password) {
        return this._passToDevice('getMicrophoneLevel', arguments);
    };

    /**
     * Get the current location of the device.
     * This is a latitude longitude pair in degrees.
     * @param {string} device name of the device (matches at the end)
     * @param {string} password current password for the device
     * @returns {Array} latitude and longitude
     */
    PhoneIoT.prototype.getLocation = function (device, password) {
        return this._passToDevice('getLocation', arguments);
    };

    /**
     * Get the current output of the proximity device.
     * This is a distance measured in cm.
     * Note that some devices only have binary proximity devices (near/far), which will take discrete two values.
     * @param {string} device name of the device (matches at the end)
     * @param {string} password current password for the device
     * @returns {Number} distance from proximity device in cm
     */
    PhoneIoT.prototype.getProximity = function (device, password) {
        return this._passToDevice('getProximity', arguments);
    };
    /**
     * Get the current output of the step counter.
     * This measures the number of steps taken since the device was started.
     * @param {string} device name of the device (matches at the end)
     * @param {string} password current password for the device
     * @returns {Number} number of steps taken
     */
    PhoneIoT.prototype.getStepCount = function (device, password) {
        return this._passToDevice('getStepCount', arguments);
    };
    /**
     * Get the current output of the light device.
     * @param {string} device name of the device (matches at the end)
     * @param {string} password current password for the device
     * @returns {Number} current light level reading
     */
    PhoneIoT.prototype.getLightLevel = function (device, password) {
        return this._passToDevice('getLightLevel', arguments);
    };

    /**
     * Get the displayed image of a custom image box.
     * @param {string} device name of the device (matches at the end)
     * @param {string} password current password for the device
     * @param {string} id the id of the custom image box
     * @returns {object} the displayed image
     */
    PhoneIoT.prototype.getImage = async function (device, password, id) {
        const bin = await this._passToDevice('getImage', arguments);

        const rsp = this.response;
        rsp.set('content-type', 'image/jpeg');
        rsp.set('content-length', bin.length);
        rsp.set('connection', 'close');
        return rsp.status(200).send(bin);
    };
    /**
     * Get the displayed image of a custom image box.
     * @param {string} device name of the device (matches at the end)
     * @param {string} password current password for the device
     * @param {string} id the id of the custom image box
     * @param {ImageBitmap} img the new image to display
     */
    PhoneIoT.prototype.setImage = function (device, password, id, img) {
        return this._passToDevice('setImage', arguments);
    };

    /**
     * Sets the total message limit for the given device.
     * @param {string} device name of the device (matches at the end)
     * @param {number} rate number of messages per seconds
     * @returns {boolean} True if the device was found
     */
    PhoneIoT.prototype.setTotalRate = function (device, rate) {
        return this._passToDevice('setTotalRate', arguments);
    };

    /**
     * Sets the client message limit and penalty for the given device.
     * @param {string} device name of the device (matches at the end)
     * @param {number} rate number of messages per seconds
     * @param {number} penalty number seconds of penalty if rate is violated
     * @returns {boolean} True if the device was found
     */
    PhoneIoT.prototype.setClientRate = function (device, rate, penalty) {
        return this._passToDevice('setClientRate', arguments);
    };
    /* eslint-enable no-unused-vars */
}

if (PHONE_IOT_MODE === 'security' || PHONE_IOT_MODE === 'both') {
    /**
     * Sends a textual command to the device
     * @param {string} device name of the device (matches at the end)
     * @param {string} command textual command
     * @returns {string} textual response
     */
    PhoneIoT.prototype.send = async function (device, command) {
        device = await this._getDevice(device);

        if (typeof command !== 'string') throw Error('command must be a string');

        // figure out the raw command after processing special methods, encryption, seq and client rate
        if (command.match(/^backdoor[, ](.*)$/)) { // if it is a backdoor directly set the command
            command = RegExp.$1;
            logger.log('executing ' + command);
        } else { // if not a backdoor handle seq number and encryption
            // for replay attacks
            device.commandToClient(command);

            if (device._hasValidEncryptionSet()) // if encryption is set
                command = device.decrypt(command);

            var seqNum = -1;
            if (command.match(/^(\d+)[, ](.*)$/)) {
                seqNum = +RegExp.$1;
                command = RegExp.$2;
            }
            if (!device.accepts(this.caller.clientId, seqNum)) {
                return false;
            }
            device.setSeqNum(seqNum);
        }

        return device.onCommand(command);
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
        var device = PhoneIoT.prototype._getOrCreateDevice(
            mac_addr, remote.address, remote.port);
        device.onMessage(message);
    }
});

/* eslint no-console: off */
if (process.env.PHONE_IOT_PORT) {
    console.log('PHONE_IOT_PORT is ' + process.env.PHONE_IOT_PORT);
    server.bind(process.env.PHONE_IOT_PORT || 1975);

    setTimeout(PhoneIoT.prototype._heartbeat, 1000);
}

PhoneIoT.isSupported = function () {
    if (!process.env.PHONE_IOT_PORT) {
        console.log('PHONE_IOT_PORT is not set (to 1975), PhoneIoT is disabled');
    }
    return !!process.env.PHONE_IOT_PORT;
};

module.exports = PhoneIoT;

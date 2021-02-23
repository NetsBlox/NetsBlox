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
 *  PHONE_IOT_PORT: set it to the UDP port (1976) to enable this module
 *  PHONE_IOT_MODE: sets the NetsBlox interface type, can be "security",
 *      "native" or "both" (default)
 */

'use strict';

const logger = require('../utils/logger')('PhoneIoT');
const Device = require('./device');
const acl = require('../roboscape/accessControl');
const dgram = require('dgram');
const server = dgram.createSocket('udp4');
const PHONE_IOT_MODE = process.env.PHONE_IOT_MODE || 'both';
const common = require('./common');
const types = require('../../input-types');

/*
 * PhoneIoT - This constructor is called on the first
 * request to an RPC from a given room.
 * @constructor
 * @return {undefined}
 */
const PhoneIoT = function () {
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
    let device = this._devices[mac_addr];
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
        for (const mac_addr in this._devices) { // pick the first match
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
    for (const mac_addr in PhoneIoT.prototype._devices) {
        const device = PhoneIoT.prototype._devices[mac_addr];
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
    const state = this._state;
    const devices = [];
    for (const mac_addr in state.registered) {
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
 * @param {string} fnName name of the method/function to call on the device object
 * @param {Array} args array of arguments
 */
PhoneIoT.prototype._passToDevice = async function (fnName, args) {
    args = Array.from(args);
    let deviceId = args.shift();
    const device = await this._getDevice(deviceId);
    console.log('caller client id:', this.caller.clientId);
    if (device.accepts(this.caller.clientId)) {
        let rv = device[fnName](device, args, this.caller.clientId);
        if (rv === undefined) rv = true;
        return rv;
    }
    throw Error('response timeout');
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

/**
 * Get the magnitude (length) of a vector.
 * @param {List} vec the vector value
 * @returns {Number} length of the vector
 */
PhoneIoT.prototype.magnitude = function(vec) { return common.magnitude(vec); };
/**
 * Get the normalized form of a vector (same direction but magnitude of 1).
 * @param {List} vec the vector value
 * @returns {List} the normalized vector
 */
PhoneIoT.prototype.normalize = function(vec) { return common.normalize(vec); };

if (PHONE_IOT_MODE === 'native' || PHONE_IOT_MODE === 'both') {
    /* eslint-disable no-unused-vars */

    /**
     * Removes all custom controls from the device.
     * @param {string} device name of the device (matches at the end)
     */
    PhoneIoT.prototype.clearControls = function (device) {
        return this._passToDevice('clearControls', arguments);
    };
    /**
     * Removes the specified custom control from the device (if it exists).
     * @param {string} device name of the device (matches at the end)
     * @param {string} id name of the control to remove.
     */
    PhoneIoT.prototype.removeControl = function (device, id) {
        return this._passToDevice('removeControl', arguments);
    };
    /**
     * Add a custom label to the device.
     * Returns the id of the created control, which is used by other RPCs.
     * @param {string} device name of the device (matches at the end)
     * @param {BoundedNumber<0, 100>} x X position of the top left corner of the label (percentage).
     * @param {BoundedNumber<0, 100>} y Y position of the top left corner of the label (percentage).
     * @param {string=} text The text to display on the label (defaults to empty)
     * @param {Object=} options Additional options: id, textColor
     * @returns {string} id of the created label
     */
    PhoneIoT.prototype.addLabel = function (device, x, y, text='', options) {
        arguments[3] = text;
        arguments[4] = common.parseOptions(options, {
            id: { parse: types.parse.String },
            textColor: { parse: types.parse.Number, default: this.getColor(0, 0, 0) },
        });
        return this._passToDevice('addLabel', arguments);
    };
    /**
     * Add a custom button to the device.
     * If an event is provided, it will be raised every time the button is pressed (params: 'id').
     * The optional 'style' value can change the appearance - can be 'rectangle' (default), 'ellipse', 'square', or 'circle'.
     * Returns the id of the created control, which is used by other RPCs.
     * @param {string} device name of the device (matches at the end)
     * @param {BoundedNumber<0, 100>} x X position of the top left corner of the button (percentage).
     * @param {BoundedNumber<0, 100>} y Y position of the top left corner of the button (percentage).
     * @param {BoundedNumber<0, 100>} width Width of the button (percentage).
     * @param {BoundedNumber<0, 100>} height Height of the button (percentage).
     * @param {string=} text text to display on the button (default empty).
     * @param {Object=} options Additional options: id, event, style, color, textColor
     * @returns {string} id of the created button
     */
    PhoneIoT.prototype.addButton = function (device, x, y, width, height, text='', options) {
        arguments[5] = text;
        arguments[6] = common.parseOptions(options, {
            style: {
                parse: v => {
                    const lower = v.toLowerCase();
                    if (lower === 'rectangle') return 0;
                    if (lower === 'ellipse') return 1;
                    if (lower === 'square') return 2;
                    if (lower === 'circle') return 3;
                    throw Error(`unknown button style: ${v}`);
                },
                default: 0,
            },
            id: { parse: types.parse.String },
            event: { parse: types.parse.String },
            color: { parse: types.parse.Number, default: this.getColor(66, 135, 245) },
            textColor: { parse: types.parse.Number, default: this.getColor(255, 255, 255) },
        });
        return this._passToDevice('addButton', arguments);
    };
    /**
     * Add a custom image display to the device, which is initially empty.
     * This can be used to display an image, or to retrieve an image taken from the device's camera.
     * If an event is provided, it will be raised every time the user stores a new image in it (params: 'id').
     * Returns the id of the created control, which is used by other RPCs.
     * @param {string} device name of the device (matches at the end)
     * @param {BoundedNumber<0, 100>} x X position of the top left corner of the image display (percentage).
     * @param {BoundedNumber<0, 100>} y Y position of the top left corner of the image display (percentage).
     * @param {BoundedNumber<0, 100>} width Width of the image display (percentage).
     * @param {BoundedNumber<0, 100>} height Height of the image display (percentage).
     * @param {Object=} options Additional options: id, event
     * @returns {string} id of the created button
     */
    PhoneIoT.prototype.addImageDisplay = function (device, x, y, width, height, options) {
        arguments[5] = common.parseOptions(options, {
            id: { parse: types.parse.String },
            event: { parse: types.parse.String },
        });
        return this._passToDevice('addImageDisplay', arguments);
    };
    /**
     * Add a custom text field to the device - users can click on it to enter text.
     * If an event is provided, it will be raised every time the user enters new text (params: 'id', 'text').
     * Returns the id of the created control, which is used by other RPCs.
     * @param {string} device name of the device (matches at the end)
     * @param {BoundedNumber<0, 100>} x X position of the top left corner of the text field (percentage).
     * @param {BoundedNumber<0, 100>} y Y position of the top left corner of the text field (percentage).
     * @param {BoundedNumber<0, 100>} width Width of the text field (percentage).
     * @param {BoundedNumber<0, 100>} height Height of the text field (percentage).
     * @param {Object=} options Additional options: id, event, text, color, textColor
     * @returns {string} id of the created button
     */
    PhoneIoT.prototype.addTextField = function (device, x, y, width, height, options) {
        arguments[5] = common.parseOptions(options, {
            id: { parse: types.parse.String },
            event: { parse: types.parse.String },
            text: { parse: types.parse.String, default: '' },
            color: { parse: types.parse.Number, default: this.getColor(66, 135, 245) },
            textColor: { parse: types.parse.Number, default: this.getColor(0, 0, 0) },
        });
        return this._passToDevice('addTextField', arguments);
    };
    /**
     * Add a custom joystick control to the device.
     * If an event is provided, it will be raised every time the joystick is moved (params: 'id', 'x', 'y').
     * Returns the id of the created control, which is used by other RPCs.
     * @param {string} device name of the device (matches at the end)
     * @param {BoundedNumber<0, 100>} x X position of the top left corner of the joystick (percentage).
     * @param {BoundedNumber<0, 100>} y Y position of the top left corner of the joystick (percentage).
     * @param {BoundedNumber<0, 100>} width Width of the joystick (percentage).
     * @param {Object=} options Additional options: id, event, color
     * @returns {string} id of the created button
     */
    PhoneIoT.prototype.addJoystick = function (device, x, y, width, options) {
        arguments[4] = common.parseOptions(options, {
            id: { parse: types.parse.String },
            event: { parse: types.parse.String },
            color: { parse: types.parse.Number, default: this.getColor(66, 135, 245) },
        });
        return this._passToDevice('addJoystick', arguments);
    };
    /**
     * Add a custom toggle control to the device.
     * The optional 'style' value changes the appearance, and can be 'checkbox' or 'switch' (default).
     * If an event is provided, it will be raised every time the control is clicked (params: 'id', 'state').
     * Returns the id of the created control, which is used by other RPCs.
     * @param {string} device name of the device (matches at the end)
     * @param {BoundedNumber<0, 100>} x X position of the top left corner of the toggle (percentage).
     * @param {BoundedNumber<0, 100>} y Y position of the top left corner of the toggle (percentage).
     * @param {string=} text The text to display next to the toggle (defaults to empty)
     * @param {Object=} options Additional options: style, id, event, state, color, textColor
     * @returns {string} id of the created toggle
     */
    PhoneIoT.prototype.addToggle = function (device, x, y, text='', options) {
        arguments[3] = text;
        arguments[4] = common.parseOptions(options, {
            style: {
                parse: v => {
                    const lower = v.toLowerCase();
                    if (lower === 'checkbox') return 0;
                    if (lower === 'switch') return 1;
                    throw Error(`unknown toggle style: ${v}`);
                },
                default: 1,
            },
            id: { parse: types.parse.String },
            event: { parse: types.parse.String },
            state: { parse: common.parseBool, default: false },
            color: { parse: types.parse.Number, default: this.getColor(66, 135, 245) },
            textColor: { parse: types.parse.Number, default: this.getColor(0, 0, 0) },
        });
        return this._passToDevice('addToggle', arguments);
    };
    /**
     * Add a custom radio button to the device.
     * A radio button is like a checkbox, but they are arranged into groups.
     * Only one radio button in each group may be checked by the user.
     * If an event is provided, it will be raised every time the control is clicked (params: 'id', 'state').
     * Returns the id of the created control, which is used by other RPCs.
     * @param {string} device name of the device (matches at the end)
     * @param {BoundedNumber<0, 100>} x X position of the top left corner of the radio button (percentage).
     * @param {BoundedNumber<0, 100>} y Y position of the top left corner of the radio button (percentage).
     * @param {string=} text The text to display next to the checkbox (defaults to empty)
     * @param {Object=} options Additional options: group, id, event, state, color, textColor
     * @returns {string} id of the created radio button
     */
    PhoneIoT.prototype.addRadioButton = function (device, x, y, text='', options) {
        arguments[3] = text;
        arguments[4] = common.parseOptions(options, {
            id: { parse: types.parse.String },
            event: { parse: types.parse.String },
            group: { parse: types.parse.String, default: 'main' },
            state: { parse: common.parseBool, default: false },
            color: { parse: types.parse.Number, default: this.getColor(66, 135, 245) },
            textColor: { parse: types.parse.Number, default: this.getColor(0, 0, 0) },
        });
        return this._passToDevice('addRadioButton', arguments);
    };
    /**
     * Set the text on a control that displays text.
     * @param {string} device name of the device (matches at the end)
     * @param {string} id Name of the control to change text on
     * @param {string=} text The new text to display (defaults to empty)
     */
    PhoneIoT.prototype.setText = function (device, id, text='') {
        arguments[2] = text;
        return this._passToDevice('setText', arguments);
    };
    /**
     * Get the text from a control that displays text.
     * @param {string} device name of the device (matches at the end)
     * @param {string} id Name of the control to read text from
     * @returns {string} The currently displayed text
     */
    PhoneIoT.prototype.getText = function (device, id) {
        return this._passToDevice('getText', arguments);
    };
    /**
     * Get the current vector output of a custom joystick control
     * @param {string} device name of the device (matches at the end)
     * @param {string} id Name of the control to read text from
     * @returns {Array} The x and y components of the normalized vector
     */
    PhoneIoT.prototype.getJoystickVector = function (device, id) {
        return this._passToDevice('getJoystickVector', arguments);
    };
    /**
     * Checks for authentication, a no-op.
     * This can be used if all you want to do is see if the login credentials are valid.
     * @param {string} device name of the device (matches at the end)
     */
    PhoneIoT.prototype.authenticate = async function (device) {
        return this._passToDevice('authenticate', arguments);
    };
    /**
     * Begin listening for events such as button presses.
     * This will check for valid login credentials (see setCredentials).
     * @param {string} device name of the device (matches at the end)
     */
    PhoneIoT.prototype.listen = async function (device) {
        this.authenticate(device); // throws on failure - we want this
        
        const _device = await this._getDevice(device);
        _device.guiListeners[this.socket.clientId] = this.socket;
    };
    /**
     * Sets the login credentials for this device.
     * Note: this does not set the password on the device. It sets what you will use to access it.
     * @param {string} device name of the device (matches at the end)
     * @param {string} password the password to use for accessing the device.
     */
    PhoneIoT.prototype.setCredentials = async function (device, password) {
        const _device = await this._getDevice(device);
        _device.credentials[this.socket.clientId] = password;
    };

    /**
     * Gets the (true/false, selected/non-selected) state of a custom control.
     * For a toggle control, this gets whether it is on or off (checked or unchecked).
     * For a button, this gets whether it is currently pressed.
     * @param {string} device name of the device (matches at the end)
     * @param {string} id name of the control to read
     * @returns {boolean} true or false, depending on the state
     */
    PhoneIoT.prototype.getState = function (device, id) {
        return this._passToDevice('getState', arguments);
    };

    /**
     * Get the orientation of the device relative to the Earth's magnetic reference frame.
     * This is returned as a list of 3 values:
     * 1. The azimuth angle, effectively the compass heading [-180, 180].
     * 2. The pitch (vertical tilt) angle [-90, 90].
     * 3. The roll angle [-90, 90].
     * @param {string} device name of the device (matches at the end)
     * @returns {Array} The orientation angles relative to the Earth's magnetic field.
     */
    PhoneIoT.prototype.getOrientation = function (device) {
        return this._passToDevice('getOrientation', arguments);
    };
    /**
     * Get the compass heading in degrees [-180, 180].
     * @param {string} device name of the device (matches at the end)
     * @returns {Number} The compass heading in degrees.
     */
    PhoneIoT.prototype.getCompassHeading = function (device) {
        return this._passToDevice('getCompassHeading', arguments);
    };
    /**
     * Get the name of the closest compass direction (N, NE, E, SE, etc.).
     * @param {string} device name of the device (matches at the end)
     * @returns {string} The compass direction name
     */
    PhoneIoT.prototype.getCompassDirection = function (device) {
        return this._passToDevice('getCompassDirection', arguments);
    };
    /**
     * Get the name of the closest compass cardinal direction (N, E, S, W).
     * @param {string} device name of the device (matches at the end)
     * @returns {string} The compass cardinal direction name
     */
    PhoneIoT.prototype.getCompassCardinalDirection = function (device) {
        return this._passToDevice('getCompassCardinalDirection', arguments);
    };

    /**
     * Get the current accelerometer output from the device.
     * This is a 3D vector with units of m/s².
     * @param {string} device name of the device (matches at the end)
     * @returns {Array} accelerometer output
     */
    PhoneIoT.prototype.getAccelerometer = function (device) {
        return this._passToDevice('getAccelerometer', arguments);
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
     * @returns {string} name of facing direction
     */
    PhoneIoT.prototype.getFacingDirection = function (device) {
        return this._passToDevice('getFacingDirection', arguments);
    };

    /**
     * Get the current output of the gravity vector device.
     * This is a 3D vector with units of m/s².
     * This is similar to the Accelerometer, but tries to account for noise from linear movement.
     * @param {string} device name of the device (matches at the end)
     * @returns {Array} output of gravity device
     */
    PhoneIoT.prototype.getGravity = function (device) {
        return this._passToDevice('getGravity', arguments);
    };

    /**
     * Get the current output of the linear acceleration device.
     * This is a 3D vector with units of m/s².
     * @param {string} device name of the device (matches at the end)
     * @returns {Array} linear acceleration vector
     */
    PhoneIoT.prototype.getLinearAcceleration = function (device) {
        return this._passToDevice('getLinearAcceleration', arguments);
    };

    /**
     * Get the current output of the gyroscope, which measures rotational acceleration.
     * This is a 3D vector with units of degrees/s² around each axis.
     * @param {string} device name of the device (matches at the end)
     * @returns {Array} output of gyroscope
     */
    PhoneIoT.prototype.getGyroscope = function (device) {
        return this._passToDevice('getGyroscope', arguments);
    };
    /**
     * Get the current output of the rotation device, which measures rotational orientation.
     * This is a unitless 4D vector representing rotation on the 3 axes, plus a scalar component.
     * For most uses, getGameRotation is more convenient.
     * @param {string} device name of the device (matches at the end)
     * @returns {Array} 4D rotational vector
     */
    PhoneIoT.prototype.getRotation = function (device) {
        return this._passToDevice('getRotation', arguments);
    };
    /**
     * Get the current output of the game rotation device, which measures rotational orientation.
     * This is a unitless 3D vector representing rotation around each axis.
     * @param {string} device name of the device (matches at the end)
     * @returns {Array} 3D rotational vector
     */
    PhoneIoT.prototype.getGameRotation = function (device) {
        return this._passToDevice('getGameRotation', arguments);
    };

    /**
     * Get the current output of the magnetic field device.
     * This is a 3D vector with units of μT (micro teslas) in each direction.
     * @param {string} device name of the device (matches at the end)
     * @returns {Array} magnetic field vector
     */
    PhoneIoT.prototype.getMagneticFieldVector = function (device) {
        return this._passToDevice('getMagneticFieldVector', arguments);
    };

    /**
     * Get the volume level from the device's microphone.
     * @param {string} device name of the device (matches at the end)
     * @returns {Array} A number representing the volume detected by the microphone.
     */
    PhoneIoT.prototype.getMicrophoneLevel = function (device) {
        return this._passToDevice('getMicrophoneLevel', arguments);
    };

    /**
     * Get the current location of the device.
     * This is a latitude longitude pair in degrees.
     * @param {string} device name of the device (matches at the end)
     * @returns {Array} latitude and longitude
     */
    PhoneIoT.prototype.getLocation = function (device) {
        return this._passToDevice('getLocation', arguments);
    };
    /**
     * Get the current bearing from the location sensor (in degrees).
     * This represents the observed direction of motion between two location samples,
     * so it's only meaningful while you are moving.
     * @param {string} device name of the device (matches at the end)
     * @returns {Number} current bearing
     */
    PhoneIoT.prototype.getBearing = function (device) {
        return this._passToDevice('getBearing', arguments);
    };
    /**
     * Get the current altitude from the location sensor (in meters above sea level).
     * @param {string} device name of the device (matches at the end)
     * @returns {Number} current bearing
     */
    PhoneIoT.prototype.getAltitude = function (device) {
        return this._passToDevice('getAltitude', arguments);
    };

    /**
     * Get the current output of the proximity device.
     * This is a distance measured in cm.
     * Note that some devices only have binary proximity devices (near/far), which will take discrete two values.
     * @param {string} device name of the device (matches at the end)
     * @returns {Number} distance from proximity device in cm
     */
    PhoneIoT.prototype.getProximity = function (device) {
        return this._passToDevice('getProximity', arguments);
    };
    /**
     * Get the current output of the step counter.
     * This measures the number of steps taken since the device was started.
     * @param {string} device name of the device (matches at the end)
     * @returns {Number} number of steps taken
     */
    PhoneIoT.prototype.getStepCount = function (device) {
        return this._passToDevice('getStepCount', arguments);
    };
    /**
     * Get the current output of the light device.
     * @param {string} device name of the device (matches at the end)
     * @returns {Number} current light level reading
     */
    PhoneIoT.prototype.getLightLevel = function (device) {
        return this._passToDevice('getLightLevel', arguments);
    };

    /**
     * Get the displayed image of a custom image box.
     * @param {string} device name of the device (matches at the end)
     * @param {string} id the id of the custom image box
     * @returns {object} the displayed image
     */
    PhoneIoT.prototype.getImage = async function (device, id) {
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
     * @param {string} id the id of the custom image box
     * @param {ImageBitmap} img the new image to display
     */
    PhoneIoT.prototype.setImage = function (device, id, img) {
        return this._passToDevice('setImage', arguments);
    };

    // /**
    //  * Sets the total message limit for the given device.
    //  * @param {string} device name of the device (matches at the end)
    //  * @param {number} rate number of messages per seconds
    //  * @returns {boolean} True if the device was found
    //  */
    // PhoneIoT.prototype.setTotalRate = function (device, rate) {
    //     return this._passToDevice('setTotalRate', arguments);
    // };

    // /**
    //  * Sets the client message limit and penalty for the given device.
    //  * @param {string} device name of the device (matches at the end)
    //  * @param {number} rate number of messages per seconds
    //  * @param {number} penalty number seconds of penalty if rate is violated
    //  * @returns {boolean} True if the device was found
    //  */
    // PhoneIoT.prototype.setClientRate = function (device, rate, penalty) {
    //     return this._passToDevice('setClientRate', arguments);
    // };
    /* eslint-enable no-unused-vars */
}

if (PHONE_IOT_MODE === 'security' || PHONE_IOT_MODE === 'both') {
    // /**
    //  * Sends a textual command to the device
    //  * @param {string} device name of the device (matches at the end)
    //  * @param {string} command textual command
    //  * @returns {string} textual response
    //  */
    // PhoneIoT.prototype.send = async function (device, command) {
    //     device = await this._getDevice(device);

    //     if (typeof command !== 'string') throw Error('command must be a string');

    //     // figure out the raw command after processing special methods, encryption, seq and client rate
    //     if (command.match(/^backdoor[, ](.*)$/)) { // if it is a backdoor directly set the command
    //         command = RegExp.$1;
    //         logger.log('executing ' + command);
    //     } else { // if not a backdoor handle seq number and encryption
    //         // for replay attacks
    //         device.commandToClient(command);

    //         // if encryption is set
    //         if (device._hasValidEncryptionSet()) command = device.decrypt(command);

    //         let seqNum = -1;
    //         if (command.match(/^(\d+)[, ](.*)$/)) {
    //             seqNum = +RegExp.$1;
    //             command = RegExp.$2;
    //         }
    //         if (!device.accepts(this.caller.clientId, seqNum)) return false;
    //         device.setSeqNum(seqNum);
    //     }

    //     return device.onCommand(command);
    // };
}

server.on('listening', function () {
    const local = server.address();
    logger.log('listening on ' + local.address + ':' + local.port);
});

server.on('message', function (message, remote) {
    if (message.length >= 6) {
        const mac_addr = message.toString('hex', 0, 6); // pull out the mac address
        const device = PhoneIoT.prototype._getOrCreateDevice(mac_addr, remote.address, remote.port);
        device.onMessage(message);
    }
    else if (message.length !== 0) logger.log('invalid message ' + remote.address + ':' + remote.port + ' ' + message.toString('hex'));
});

/* eslint no-console: off */
if (process.env.PHONE_IOT_PORT) {
    console.log('PHONE_IOT_PORT is ' + process.env.PHONE_IOT_PORT);
    server.bind(process.env.PHONE_IOT_PORT || 1976);

    setTimeout(PhoneIoT.prototype._heartbeat, 1000);
}

PhoneIoT.isSupported = function () {
    if (!process.env.PHONE_IOT_PORT) {
        console.log('PHONE_IOT_PORT is not set (to 1976), PhoneIoT is disabled');
    }
    return !!process.env.PHONE_IOT_PORT;
};

module.exports = PhoneIoT;

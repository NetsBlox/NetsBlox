/**
 * PhoneIoT is meant to be used with the PhoneIoT mobile app.
 * It allows your Android phone or iPhone to be used as an sensor and input device accessible from inside Netsblox.
 * 
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
const _ = require('lodash');

// these types are used for communication with PhoneIoT
const myTypes = {};
myTypes.ButtonStyle = input => types.parse.Enum(input, { rectangle: 0, ellipse: 1, square: 2, circle: 3 }, undefined, 'Button Style');
myTypes.ToggleStyle = input => types.parse.Enum(input, { switch: 0, checkbox: 1 }, undefined, 'Toggle Style');
myTypes.Align = input => types.parse.Enum(input, { left: 0, center: 1, right: 2 }, undefined, 'Align');
myTypes.Fit = input => types.parse.Enum(input, { fit: 0, zoom: 1, stretch: 2 }, undefined, 'Fit');
myTypes.FontSize = input => types.parse.BoundedNumber(input, [0.1, 10.0]);
myTypes.SensorPeriod = input => types.parse.BoundedNumber(input, [100, undefined]);
myTypes.Color = input => types.parse.Number(input);
myTypes.Device = async (input, params, ctx) => {
    const deviceId = await types.parse.BoundedString(input, [4, 12]);
    let device;

    if (deviceId.length === 12) {
        device = PhoneIoT.prototype._devices[deviceId];
    } else { // try to guess the rest of the id
        for (const mac_addr in this._devices) { // pick the first match
            if (mac_addr.endsWith(deviceId)) {
                const deviceId = mac_addr;
                device = PhoneIoT.prototype._devices[deviceId];
            }
        }
    }

    if (!device) throw Error('Device not found.');
    await acl.ensureAuthorized(ctx.caller.username, deviceId);
    return device;
};

for (const type in myTypes) {
    types.defineType(type, myTypes[type]);
}

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
 * @category Utility
 * @returns {array}
 */
PhoneIoT.prototype._getDevices = async function () {
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
    const device = args.shift();
    if (device.accepts(this.caller.clientId)) {
        let rv = device[fnName](device, args, this.caller.clientId);
        if (rv === undefined) rv = true;
        return rv;
    }
    throw Error('response timeout');
};

/**
 * Get the color code for the specified red green and blue levels.
 * @category Utility
 * @param {BoundedNumber<0, 255>} red red level (0-255).
 * @param {BoundedNumber<0, 255>} green green level (0-255).
 * @param {BoundedNumber<0, 255>} blue blue level (0-255).
 * @param {BoundedNumber<0, 255>=} alpha alpha (opacity) level (0-255).
 * @returns {Color} Constructed color code
 */
PhoneIoT.prototype.getColor = function (red, green, blue, alpha = 255) {
    return ((alpha & 0xff) << 24) | ((red & 0xff) << 16) | ((green & 0xff) << 8) | (blue & 0xff);
};

/**
 * Get the magnitude (length) of a vector.
 * @category Utility
 * @param {List} vec the vector value
 * @returns {Number} length of the vector
 */
PhoneIoT.prototype.magnitude = function(vec) { return common.magnitude(vec); };
/**
 * Get the normalized form of a vector (same direction but magnitude of 1).
 * @category Utility
 * @param {List} vec the vector value
 * @returns {List} the normalized vector
 */
PhoneIoT.prototype.normalize = function(vec) { return common.normalize(vec); };

if (PHONE_IOT_MODE === 'native' || PHONE_IOT_MODE === 'both') {
    /* eslint-disable no-unused-vars */

    /**
     * Removes all custom controls from the device.
     * @category Display
     * @param {Device} device name of the device (matches at the end)
     */
    PhoneIoT.prototype.clearControls = function (device) {
        return this._passToDevice('clearControls', arguments);
    };
    /**
     * Removes the specified custom control from the device (if it exists).
     * @category Display
     * @param {Device} device name of the device (matches at the end)
     * @param {String} id name of the control to remove.
     */
    PhoneIoT.prototype.removeControl = function (device, id) {
        return this._passToDevice('removeControl', arguments);
    };
    /**
     * Add a custom label to the device.
     * Returns the id of the created control, which is used by other RPCs.
     * @category Display
     * @param {Device} device name of the device (matches at the end)
     * @param {BoundedNumber<0, 100>} x X position of the top left corner of the label (percentage).
     * @param {BoundedNumber<0, 100>} y Y position of the top left corner of the label (percentage).
     * @param {String=} text The text to display on the label (defaults to empty)
     * @param {Object=} options Additional options: id, textColor, align, fontSize, landscape
     * @param {String=} options.id ID of the label
     * @param {Color=} options.textColor Color of the text to display
     * @param {FontSize=} options.fontSize Font size of label text
     * @param {Align=} options.align Alignment of the label
     * @param {Boolean=} options.landscape Set landscape mode (rather than portrait)
     * @returns {String} id of the created label
     */
    PhoneIoT.prototype.addLabel = function (device, x, y, text='', options) {
        arguments[3] = text;
        const DEFAULTS = {
            textColor: this.getColor(0, 0, 0),
            fontSize: 1.0,
            align: 0,
            landscape: false
        };
        arguments[4] = _.merge({}, DEFAULTS, options);
        return this._passToDevice('addLabel', arguments);
    };
    /**
     * Add a custom button to the device.
     * If an event is provided, it will be raised every time the button is pressed (params: 'id').
     * The optional 'style' value can change the appearance - can be 'rectangle' (default), 'ellipse', 'square', or 'circle'.
     * Returns the id of the created control, which is used by other RPCs.
     * @category Display
     * @param {Device} device name of the device (matches at the end)
     * @param {BoundedNumber<0, 100>} x X position of the top left corner of the button (percentage).
     * @param {BoundedNumber<0, 100>} y Y position of the top left corner of the button (percentage).
     * @param {BoundedNumber<0, 100>} width Width of the button (percentage).
     * @param {BoundedNumber<0, 100>} height Height of the button (percentage).
     * @param {String=} text text to display on the button (default empty).
     * @param {Object=} options Additional options: id, event, style, color, textColor, landscape, fontSize
     * @param {ButtonStyle=} options.style button appearance
     * @param {String=} options.id button id (defaults to auto-generated)
     * @param {String=} options.event click event (defaults to no event)
     * @param {Color=} options.color background color
     * @param {Color=} options.textColor text color
     * @param {Boolean=} options.landscape true rotates the control 90 degrees on the display
     * @param {FontSize=} options.fontSize size of text (default 1.0)
     * @returns {String} id of the created button
     */
    PhoneIoT.prototype.addButton = function (device, x, y, width, height, text='', options) {
        const DEFAULTS = {
            style: 0,
            color: this.getColor(66, 135, 245),
            textColor: this.getColor(255, 255, 255),
            landscape: false,
            fontSize: 1.0,
        };
        arguments[5] = text;
        arguments[6] = _.merge({}, DEFAULTS, options);
        return this._passToDevice('addButton', arguments);
    };
    /**
     * Add a custom image display to the device, which is initially empty.
     * This can be used to display an image, or to retrieve an image taken from the device's camera.
     * Image displays default to readonly, meaning the user cannot modify their content from the phone (can only change from NetsBlox code).
     * If not set to readonly (passing optional parameter readonly false), a user can click on the control to take a new image from the camera.
     * If an event is provided, it will be raised every time the user stores a new image in it (params: 'id').
     * The fit option can be set to 'fit' (default), 'zoom', or 'stretch'.
     * Returns the id of the created control, which is used by other RPCs.
     * @category Display
     * @param {Device} device name of the device (matches at the end)
     * @param {BoundedNumber<0, 100>} x X position of the top left corner of the image display (percentage).
     * @param {BoundedNumber<0, 100>} y Y position of the top left corner of the image display (percentage).
     * @param {BoundedNumber<0, 100>} width Width of the image display (percentage).
     * @param {BoundedNumber<0, 100>} height Height of the image display (percentage).
     * @param {Object=} options Additional options: id, event, readonly, landscape, fit
     * @param {String=} options.id id of the image display
     * @param {String=} options.event message to send when image is changed by the user
     * @param {Boolean=} options.readonly true to disable user from changing the image
     * @param {Boolean=} options.landscape true to rotate 90 degrees to landscape mode
     * @param {Fit=} options.fit sets how to position and scale the image in the display
     * @returns {String} id of the created button
     */
    PhoneIoT.prototype.addImageDisplay = function (device, x, y, width, height, options) {
        const DEFAULTS = {
            readonly: true,
            landscape: false,
            fit: 0,
        };
        arguments[5] = _.merge({}, DEFAULTS, options);
        return this._passToDevice('addImageDisplay', arguments);
    };
    /**
     * Add a custom text field to the device - unless set to readonly, users can click on it to enter text.
     * If an event is provided, it will be raised every time the user enters new text (params: 'id', 'text').
     * Returns the id of the created control, which is used by other RPCs.
     * @category Display
     * @param {Device} device name of the device (matches at the end)
     * @param {BoundedNumber<0, 100>} x X position of the top left corner of the text field (percentage).
     * @param {BoundedNumber<0, 100>} y Y position of the top left corner of the text field (percentage).
     * @param {BoundedNumber<0, 100>} width Width of the text field (percentage).
     * @param {BoundedNumber<0, 100>} height Height of the text field (percentage).
     * @param {Object=} options Additional options: id, event, text, color, textColor, readonly, fontSize, align, landscape
     * @param {String=} options.id id of the new text field
     * @param {String=} options.event event to send when the user changes the text
     * @param {String=} options.text initial text to display (defaults to empty)
     * @param {Color=} options.color color of the text field outline
     * @param {Color=} options.textColor color of the text
     * @param {Boolean=} options.readonly true to disable user from changing the text
     * @param {FontSize=} options.fontSize size of the text (default 1.0)
     * @param {Align=} options.align alignment of the text
     * @param {Boolean=} options.landscape true to rotate 90 degrees to landscape mode
     * @returns {String} id of the created button
     */
    PhoneIoT.prototype.addTextField = function (device, x, y, width, height, options) {
        const DEFAULTS = {
            text: '',
            color: this.getColor(66, 135, 245),
            textColor: this.getColor(0, 0, 0),
            readonly: false,
            fontSize: 1.0,
            align: 0,
            landscape: false
        };
        arguments[5] = _.merge({}, DEFAULTS, options);
        return this._passToDevice('addTextField', arguments);
    };
    /**
     * Add a custom joystick control to the device.
     * If an event is provided, it will be raised every time the joystick is moved (params: 'id', 'x', 'y').
     * Returns the id of the created control, which is used by other RPCs.
     * @category Display
     * @param {Device} device name of the device (matches at the end)
     * @param {BoundedNumber<0, 100>} x X position of the top left corner of the joystick (percentage).
     * @param {BoundedNumber<0, 100>} y Y position of the top left corner of the joystick (percentage).
     * @param {BoundedNumber<0, 100>} width Width of the joystick (percentage).
     * @param {Object=} options Additional options: id, event, color, landscape
     * @param {String=} options.id id of the new joystick (defaults to auto generated)
     * @param {String=} options.event event to send when the joystick moves (defaults to no event)
     * @param {Color=} options.color joystick color
     * @param {Boolean=} options.landscape true to rotate x,y values to act as if in portrait mode
     * @returns {String} id of the created button
     */
    PhoneIoT.prototype.addJoystick = function (device, x, y, width, options) {
        const DEFAULTS = {
            color: this.getColor(66, 135, 245),
            landscape: false,
        };
        arguments[4] = _.merge({}, DEFAULTS, options);
        return this._passToDevice('addJoystick', arguments);
    };
    /**
     * Add a custom toggle control to the device.
     * The optional 'style' value changes the appearance, and can be 'checkbox' or 'switch' (default).
     * If an event is provided, it will be raised every time the control is clicked (params: 'id', 'state').
     * Returns the id of the created control, which is used by other RPCs.
     * @category Display
     * @param {Device} device name of the device (matches at the end)
     * @param {BoundedNumber<0, 100>} x X position of the top left corner of the toggle (percentage).
     * @param {BoundedNumber<0, 100>} y Y position of the top left corner of the toggle (percentage).
     * @param {String=} text The text to display next to the toggle (defaults to empty)
     * @param {Object=} options Additional options: style, id, event, checked, color, textColor, fontSize, landscape, readonly
     * @param {ToggleStyle=} options.style toggle appearance
     * @param {String=} options.id id of the toggle (defaults to auto generated)
     * @param {String=} options.event event to send when toggle is clicked (defaults to no event)
     * @param {Boolean=} options.checked sets the initial check state of the toggle
     * @param {Color=} options.color toggle color
     * @param {Color=} options.textColor toggle label color
     * @param {FontSize=} options.fontSize font size of the label (also scales toggle size)
     * @param {Boolean=} options.landscape true to rotate control 90 degrees to landscape
     * @param {Boolean=} options.readonly true to prevent the user from clicking the toggle
     * @returns {String} id of the created toggle
     */
    PhoneIoT.prototype.addToggle = function (device, x, y, text='', options) {
        const DEFAULTS = {
            style: 0,
            checked: false,
            color: this.getColor(66, 135, 245),
            textColor: this.getColor(0, 0, 0),
            fontSize: 1.0,
            landscape: false,
            readonly: false,
        };
        arguments[3] = text;
        arguments[4] = _.merge({}, DEFAULTS, options);
        return this._passToDevice('addToggle', arguments);
    };
    /**
     * Add a custom radio button to the device.
     * A radio button is like a checkbox, but they are arranged into groups.
     * Only one radio button in each group may be checked by the user.
     * If an event is provided, it will be raised every time the control is clicked (params: 'id', 'state').
     * Returns the id of the created control, which is used by other RPCs.
     * @category Display
     * @param {Device} device name of the device (matches at the end)
     * @param {BoundedNumber<0, 100>} x X position of the top left corner of the radio button (percentage).
     * @param {BoundedNumber<0, 100>} y Y position of the top left corner of the radio button (percentage).
     * @param {String=} text The text to display next to the checkbox (defaults to empty)
     * @param {Object=} options Additional options: group, id, event, checked, color, textColor, fontSize, landscape, readonly
     * @param {String=} options.id id of the radio button (default to auto-generated)
     * @param {String=} options.event event to raise when user clicks the radio button (defaults to no event)
     * @param {String=} options.group radio button group (defaults to 'main')
     * @param {Boolean=} options.checked initial check state of the radio button
     * @param {Color=} options.color color of the radio button itself
     * @param {Color=} options.textColor radio button label text color
     * @param {FontSize=} options.fontSize font size of the label text (also scales the radio button size)
     * @param {Boolean=} options.landscape true to rotate 90 degrees to landscape mode
     * @param {Boolean=} options.readonly true to disable users from checking the radio button
     * @returns {String} id of the created radio button
     */
    PhoneIoT.prototype.addRadioButton = function (device, x, y, text='', options) {
        const DEFAULTS = {
            group: 'main',
            checked: false,
            color: this.getColor(66, 135, 245),
            textColor: this.getColor(0, 0, 0),
            fontSize: 1.0,
            landscape: false,
            readonly: false,
        };
        arguments[3] = text;
        arguments[4] = _.merge({}, DEFAULTS, options);
        return this._passToDevice('addRadioButton', arguments);
    };
    /**
     * Set the text on a control that displays text.
     * @category Display
     * @param {Device} device name of the device (matches at the end)
     * @param {String} id Name of the control to change text on
     * @param {String=} text The new text to display (defaults to empty)
     */
    PhoneIoT.prototype.setText = function (device, id, text='') {
        arguments[2] = text;
        return this._passToDevice('setText', arguments);
    };
    /**
     * Get the text from a control that displays text.
     * @category Display
     * @param {Device} device name of the device (matches at the end)
     * @param {String} id Name of the control to read text from
     * @returns {String} The currently displayed text
     */
    PhoneIoT.prototype.getText = function (device, id) {
        return this._passToDevice('getText', arguments);
    };
    /**
     * Get the current vector output of a custom joystick control
     * @category Display
     * @param {Device} device name of the device (matches at the end)
     * @param {String} id Name of the control to read text from
     * @returns {Array} The x and y components of the normalized vector
     */
    PhoneIoT.prototype.getJoystickVector = function (device, id) {
        return this._passToDevice('getJoystickVector', arguments);
    };
    /**
     * Checks for authentication, a no-op.
     * This can be used if all you want to do is see if the login credentials are valid.
     * @param {Device} device name of the device (matches at the end)
     */
    PhoneIoT.prototype.authenticate = async function (device) {
        return this._passToDevice('authenticate', arguments);
    };
    /**
     * Begin listening to GUI events such as button presses.
     * This will check for valid login credentials (see setCredentials).
     * @param {Device} device name of the device (matches at the end)
     */
    PhoneIoT.prototype.listenToGUI = async function (device) {
        await this.authenticate(device); // throws on failure - we want this
        
        device.guiListeners[this.socket.clientId] = this.socket;
    };
    /**
     * Listen for the specified sensor update events, with a specified minimum interval for each.
     * This will discard any previous call to listenToSensors; thus, calling with an empty list will stop listening to all sensors.
     * This will check for valid login credentials (see setCredentials).
     * Calling getSensors will give you a list of all the sensor names.
     * The events are sent to a message type of the same name as the sensor.
     * 3D values have arguments x, y, z. 4D values have x, y, z, w. Otherwise, see below:
     * light - value
     * sound - volume
     * proximity - distance
     * step counter - count
     * location - latitude, longitude, bearing, altitude
     * Additionally, all sensors receive an argument called 'device', which holds the device id.
     * @param {Device} device name of the device (matches at the end)
     * @param {Object=} sensors structured data representing the minimum time in milliseconds between updates for each sensor type to listen for.
     * @param {SensorPeriod=} sensors.gravity update period for gravity sensor
     * @param {SensorPeriod=} sensors.gyroscope update period for gyroscope sensor
     * @param {SensorPeriod=} sensors.orientation update period for orientation sensor
     * @param {SensorPeriod=} sensors.accelerometer update period for accelerometer sensor
     * @param {SensorPeriod=} sensors.magneticField update period for magneticField sensor
     * @param {SensorPeriod=} sensors.rotation update period for rotation sensor
     * @param {SensorPeriod=} sensors.linearAcceleration update period for linearAcceleration sensor
     * @param {SensorPeriod=} sensors.gameRotation update period for gameRotation sensor
     * @param {SensorPeriod=} sensors.lightLevel update period for lightLevel sensor
     * @param {SensorPeriod=} sensors.microphoneLevel update period for microphoneLevel sensor
     * @param {SensorPeriod=} sensors.proximity update period for proximity sensor
     * @param {SensorPeriod=} sensors.stepCount update period for stepCount sensor
     * @param {SensorPeriod=} sensors.location update period for location sensor
     */
    PhoneIoT.prototype.listenToSensors = async function (device, sensors={}) {
        const clientID = this.socket.clientId;

        const periods = Object.values(sensors);
        let minPeriod = Math.min(...periods);
        for (const sensor in device.sensorToListeners) {
            const listeners = device.sensorToListeners[sensor];
            for (const listener in listeners) {
                if (listener === clientID) continue; // skip ourselves since we're changing that
                const period = listeners[listener][2];
                if (period < minPeriod) minPeriod = period;
            }
        }
        await device.setSensorUpdatePeriods(minPeriod === Infinity ? [] : [minPeriod], clientID); // throws on failure - we want this

        // get a time stamp prior to max period so we'll receive an update immediately
        const timestamp = new Date();
        timestamp.setMilliseconds(timestamp.getMilliseconds() - Math.max(...periods));

        // stop listening from all sensors
        for (const sensor in device.sensorToListeners) {
            const listeners = device.sensorToListeners[sensor];
            delete listeners[clientID];
        }

        // start listening to the requested sensors
        for (const sensor in sensors) {
            let listeners = device.sensorToListeners[sensor];
            if (listeners === undefined) {
                listeners = {};
                device.sensorToListeners[sensor] = listeners;
            }
            listeners[clientID] = [this.socket, timestamp, sensors[sensor]];
        }
    };
    /**
     * Gets a list of the names of all available sensors.
     * These are needed for listenToSensors.
     * @category Utility
     * @returns {Array} list of sensor names
     */
    PhoneIoT.prototype.getSensors = function () {
        return Object.keys(common.SENSOR_PACKERS);
    };
    /**
     * Sets the login credentials for this device.
     * Note: this does not set the password on the device. It sets what you will use to access it.
     * @param {Device} device name of the device (matches at the end)
     * @param {String} password the password to use for accessing the device.
     */
    PhoneIoT.prototype.setCredentials = async function (device, password) {
        device.credentials[this.socket.clientId] = password;
    };

    /**
     * Checks if a pressable control (like a button) is currently pressed (held) down.
     * @category Display
     * @param {Device} device name of the device (matches at the end)
     * @param {String} id name of the control to read
     * @returns {boolean} true or false, depending on if the control is pressed
     */
    PhoneIoT.prototype.isPressed = function (device, id) {
        return this._passToDevice('isPressed', arguments);
    };

    /**
     * Gets the toggle state of a toggleable custom control.
     * @category Display
     * @param {Device} device name of the device (matches at the end)
     * @param {String} id name of the control to read
     * @returns {boolean} true or false, depending on the state
     */
    PhoneIoT.prototype.getToggleState = function (device, id) {
        return this._passToDevice('getToggleState', arguments);
    };
    /**
     * Sets the toggle state of a toggleable custom control.
     * @category Display
     * @param {Device} device name of the device (matches at the end)
     * @param {String} id name of the control to modify
     * @param {boolean} state new value for the toggle state
     */
    PhoneIoT.prototype.setToggleState = function (device, id, state) {
        return this._passToDevice('setToggleState', arguments);
    };

    /**
     * Get the orientation of the device relative to the Earth's magnetic reference frame.
     * This is returned as a list of 3 values:
     * 1. The azimuth angle, effectively the compass heading [-180, 180].
     * 2. The pitch (vertical tilt) angle [-90, 90].
     * 3. The roll angle [-90, 90].
     * @category Sensors
     * @param {Device} device name of the device (matches at the end)
     * @returns {Array} The orientation angles relative to the Earth's magnetic field.
     */
    PhoneIoT.prototype.getOrientation = function (device) {
        return this._passToDevice('getOrientation', arguments);
    };
    /**
     * Get the compass heading in degrees [-180, 180].
     * @category Sensors
     * @param {Device} device name of the device (matches at the end)
     * @returns {Number} The compass heading in degrees.
     */
    PhoneIoT.prototype.getCompassHeading = function (device) {
        return this._passToDevice('getCompassHeading', arguments);
    };
    /**
     * Get the name of the closest compass direction (N, NE, E, SE, etc.).
     * @category Sensors
     * @param {Device} device name of the device (matches at the end)
     * @returns {String} The compass direction name
     */
    PhoneIoT.prototype.getCompassDirection = function (device) {
        return this._passToDevice('getCompassDirection', arguments);
    };
    /**
     * Get the name of the closest compass cardinal direction (N, E, S, W).
     * @category Sensors
     * @param {Device} device name of the device (matches at the end)
     * @returns {String} The compass cardinal direction name
     */
    PhoneIoT.prototype.getCompassCardinalDirection = function (device) {
        return this._passToDevice('getCompassCardinalDirection', arguments);
    };

    /**
     * Get the current accelerometer output from the device.
     * This is a 3D vector with units of m/s².
     * @category Sensors
     * @param {Device} device name of the device (matches at the end)
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
     * @category Sensors
     * @param {Device} device name of the device (matches at the end)
     * @returns {String} name of facing direction
     */
    PhoneIoT.prototype.getFacingDirection = function (device) {
        return this._passToDevice('getFacingDirection', arguments);
    };

    /**
     * Get the current output of the gravity vector sensor.
     * This is a 3D vector with units of m/s².
     * This is similar to the Accelerometer, but tries to account for noise from linear movement.
     * @category Sensors
     * @param {Device} device name of the device (matches at the end)
     * @returns {Array} output of gravity sensor
     */
    PhoneIoT.prototype.getGravity = function (device) {
        return this._passToDevice('getGravity', arguments);
    };

    /**
     * Get the current output of the linear acceleration sensor.
     * This is a 3D vector with units of m/s².
     * @category Sensors
     * @param {Device} device name of the device (matches at the end)
     * @returns {Array} linear acceleration vector
     */
    PhoneIoT.prototype.getLinearAcceleration = function (device) {
        return this._passToDevice('getLinearAcceleration', arguments);
    };

    /**
     * Get the current output of the gyroscope, which measures rotational acceleration.
     * This is a 3D vector with units of degrees/s² around each axis.
     * @category Sensors
     * @param {Device} device name of the device (matches at the end)
     * @returns {Array} output of gyroscope
     */
    PhoneIoT.prototype.getGyroscope = function (device) {
        return this._passToDevice('getGyroscope', arguments);
    };
    /**
     * Get the current output of the rotation sensor, which measures rotational orientation.
     * This is a unitless 4D vector representing rotation on the 3 axes, plus a scalar component.
     * For most uses, getGameRotation is more convenient.
     * @category Sensors
     * @param {Device} device name of the device (matches at the end)
     * @returns {Array} 4D rotational vector
     */
    PhoneIoT.prototype.getRotation = function (device) {
        return this._passToDevice('getRotation', arguments);
    };
    /**
     * Get the current output of the game rotation sensor, which measures rotational orientation.
     * This is a unitless 3D vector representing rotation around each axis.
     * @category Sensors
     * @param {Device} device name of the device (matches at the end)
     * @returns {Array} 3D rotational vector
     */
    PhoneIoT.prototype.getGameRotation = function (device) {
        return this._passToDevice('getGameRotation', arguments);
    };

    /**
     * Get the current output of the magnetic field sensor.
     * This is a 3D vector with units of μT (micro teslas) in each direction.
     * @category Sensors
     * @param {Device} device name of the device (matches at the end)
     * @returns {Array} magnetic field vector
     */
    PhoneIoT.prototype.getMagneticField = function (device) {
        return this._passToDevice('getMagneticField', arguments);
    };

    /**
     * Get the volume level from the device's microphone.
     * @category Sensors
     * @param {Device} device name of the device (matches at the end)
     * @returns {Array} A number representing the volume detected by the microphone.
     */
    PhoneIoT.prototype.getMicrophoneLevel = function (device) {
        return this._passToDevice('getMicrophoneLevel', arguments);
    };

    /**
     * Get the current location of the device.
     * This is a latitude longitude pair in degrees.
     * @category Sensors
     * @param {Device} device name of the device (matches at the end)
     * @returns {Array} latitude and longitude
     */
    PhoneIoT.prototype.getLocation = function (device) {
        return this._passToDevice('getLocation', arguments);
    };
    /**
     * Get the current bearing from the location sensor (in degrees).
     * This represents the observed direction of motion between two location samples,
     * so it's only meaningful while you are moving.
     * @category Sensors
     * @param {Device} device name of the device (matches at the end)
     * @returns {Number} current bearing
     */
    PhoneIoT.prototype.getBearing = function (device) {
        return this._passToDevice('getBearing', arguments);
    };
    /**
     * Get the current altitude from the location sensor (in meters above sea level).
     * @category Sensors
     * @param {Device} device name of the device (matches at the end)
     * @returns {Number} current bearing
     */
    PhoneIoT.prototype.getAltitude = function (device) {
        return this._passToDevice('getAltitude', arguments);
    };

    /**
     * Get the current output of the proximity sensor.
     * This is a distance measured in cm.
     * Note that some devices only have binary proximity sensors (near/far), which will take discrete two values.
     * @category Sensors
     * @param {Device} device name of the device (matches at the end)
     * @returns {Number} distance from proximity sensor in cm
     */
    PhoneIoT.prototype.getProximity = function (device) {
        return this._passToDevice('getProximity', arguments);
    };
    /**
     * Get the current output of the step counter.
     * This measures the number of steps taken since the device was started.
     * @category Sensors
     * @param {Device} device name of the device (matches at the end)
     * @returns {Number} number of steps taken
     */
    PhoneIoT.prototype.getStepCount = function (device) {
        return this._passToDevice('getStepCount', arguments);
    };
    /**
     * Get the current output of the light sensor.
     * @category Sensors
     * @param {Device} device name of the device (matches at the end)
     * @returns {Number} current light level reading
     */
    PhoneIoT.prototype.getLightLevel = function (device) {
        return this._passToDevice('getLightLevel', arguments);
    };

    /**
     * Get the displayed image of a custom image box.
     * @category Display
     * @param {Device} device name of the device (matches at the end)
     * @param {String} id the id of the custom image box
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
     * @category Display
     * @param {Device} device name of the device (matches at the end)
     * @param {String} id the id of the custom image box
     * @param {ImageBitmap} img the new image to display
     */
    PhoneIoT.prototype.setImage = function (device, id, img) {
        return this._passToDevice('setImage', arguments);
    };

    // /**
    //  * Sets the total message limit for the given device.
    //  * @param {Device} device name of the device (matches at the end)
    //  * @param {number} rate number of messages per seconds
    //  * @returns {boolean} True if the device was found
    //  */
    // PhoneIoT.prototype.setTotalRate = function (device, rate) {
    //     return this._passToDevice('setTotalRate', arguments);
    // };

    // /**
    //  * Sets the client message limit and penalty for the given device.
    //  * @param {Device} device name of the device (matches at the end)
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
    //  * @param {Device} device name of the device (matches at the end)
    //  * @param {String} command textual command
    //  * @returns {String} textual response
    //  */
    // PhoneIoT.prototype.send = async function (device, command) {
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

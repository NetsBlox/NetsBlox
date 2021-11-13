/**
 * PhoneIoT is a service in `NetsBlox <https://netsblox.org/>`__ that's meant to teach Internet of Things (IoT) topics as early as K-12 education.
 * It allows you to programmatically access your smartphone's sensors and display.
 * This includes accessing hardware sensors such as the accelerometer, gyroscope, microphone, camera, and many others depending on the device.
 * PhoneIoT also allows you to control a customizable interactive display, enabling you to use your device as a custom remote control, or even create and run distributed (multiplayer) applications.
 * The limits are up to your imagination!
 * 
 * To get started using PhoneIoT, download the PhoneIoT app on your mobile device, available for `Android <https://play.google.com/store/apps/details?id=org.netsblox.phoneiot>`__ and iOS, and then go to the `NetsBlox editor <https://editor.NetsBlox.org>`__.
 * In the top left of the editor, you should see a grid of several colored tabs.
 * Under the ``Network`` tab, grab a ``call`` block and place it in the center script area.
 * Click the first dropdown on the ``call`` block and select the ``PhoneIoT`` service.
 * The second dropdown selects the specific *Remote Procedure Call* (RPC) to execute - see the table of contents  for information about the various RPCs.
 * 
 * Inside the PhoneIoT app on your mobile device, click the button at the top left to open the menu, and then click ``connect``.
 * If you successfully connected, you should get a small popup message at the bottom of the screen.
 * `If you don't see this message, make sure you have either Wi-Fi or mobile data turned on and try again.`
 * Near the top of the menu, you should see an ID and password, which will be needed to connect to the device from NetsBlox.
 * 
 * Back in NetsBlox, select the ``setCredentials`` RPC and give it your ID and password.
 * For convenience, you might want to save the ID in a variable (e.g. ``device``), as it will be referenced many times.
 * If you click the ``call`` block to run it, you should get an ``OK`` result, meaning you successfully connected.
 * `If you don't see this, make sure you entered the ID and password correctly.`
 * 
 * You're now ready to start using the other RPCs in PhoneIoT to communicate with the device!
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
types.defineType({
    name: 'SliderStyle',
    description: 'The style to use for displaying :doc:`/services/PhoneIoT/index` slider, as created by :func:`PhoneIoT.addSlider`.',
    baseType: 'Enum',
    baseParams: { slider: 0, progress: 1 },
});
types.defineType({
    name: 'TouchpadStyle', 
    description: 'The style to use for displaying a :doc:`/services/PhoneIoT/index` touchpad, as created by :func:`PhoneIoT.addTouchpad`.',
    baseType: 'Enum',
    baseParams: { rectangle: 0, square: 1 },
});
types.defineType({
    name: 'ButtonStyle',
    description: 'The style to use for displaying a :doc:`/services/PhoneIoT/index` button, as created by :func:`PhoneIoT.addButton`.',
    baseType: 'Enum',
    baseParams: { rectangle: 0, ellipse: 1, square: 2, circle: 3 },
});
types.defineType({
    name: 'ToggleStyle',
    description: 'The style to use for displaying a :doc:`/services/PhoneIoT/index` toggle control, as created by :func:`PhoneIoT.addToggle`.',
    baseType: 'Enum',
    baseParams: { switch: 0, checkbox: 1 },
});
types.defineType({
    name: 'Align',
    description: 'The strategy for aligning text in a :doc:`/services/PhoneIoT/index` control such as :func:`PhoneIoT.addLabel`.',
    baseType: 'Enum',
    baseParams: { left: 0, center: 1, right: 2 },
});
types.defineType({
    name: 'Fit',
    description: 'The strategy for positioning an image in a :doc:`/services/PhoneIoT/index` image display, as created by :func:`PhoneIoT.addImageDisplay`.',
    baseType: 'Enum',
    baseParams: { fit: 0, zoom: 1, stretch: 2 },
});
types.defineType({
    name: 'FontSize',
    description: 'The font size of text in a :doc:`/services/PhoneIoT/index` control.',
    baseType: 'BoundedNumber',
    baseParams: ['0.1', '10.0'],
});
types.defineType({
    name: 'SensorPeriod',
    description: 'An update period (interval) for :doc:`/services/PhoneIoT/index` sensors. This is used by :func:`PhoneIoT.listenToSensors` to start receiving a stream of periodic update messages.',
    baseType: 'BoundedNumber',
    baseParams: ['100'],
});
types.defineType({
    name: 'Color',
    description: 'A color code used by :doc:`/services/PhoneIoT/index`. You can create color codes with :func:`PhoneIoT.getColor`.',
    baseType: 'Integer',
});
types.defineType({
    name: 'Position',
    description: 'The position of a :doc:`/services/PhoneIoT/index` control as a percentage of the screen from the top left corner.',
    baseType: 'BoundedNumber',
    baseParams: ['0', '100'],
});
types.defineType({
    name: 'Size',
    description: 'The size of a :doc:`/services/PhoneIoT/index` control as a percentage of the screen.',
    baseType: 'BoundedNumber',
    baseParams: ['0', '100'],
});
types.defineType({
    name: 'Device',
    description: 'A :doc:`/services/PhoneIoT/index` device ID. The device must be connected to be valid.',
    baseType: 'BoundedString',
    baseParams: ['4', '12'],
    parser: async (deviceId, params, ctx) => {
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
    },
});

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
        if (device.requestDisconnect || !device.heartbeat()) {
            logger.log('forgetting ' + mac_addr);
            delete PhoneIoT.prototype._devices[mac_addr];
        }
    }
    setTimeout(PhoneIoT.prototype._heartbeat, 1000); // must be every second to preserve timing logic
};

/**
 * Returns the MAC addresses of the registered devices for this client.
 * @returns {Array<String>} the list of registered devices
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
 * @returns {Array<String>}
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
 * Many of the :doc:`Display` RPCs take one or more optional parameters for controlling display color, which is specified as an integer.
 * This RPC is a convenience function for constructing a color code from ``red``, ``green``, ``blue``, and ``alpha`` values (each is ``0-255``).
 * 
 * The ``alpha`` value controls transparency, with ``0`` being invisible and ``255`` being opaque.
 * If not specified, ``alpha`` will default to ``255``.
 * 
 * @category Utility
 * @param {BoundedInteger<0,255>} red red level (0-255)
 * @param {BoundedInteger<0,255>} green green level (0-255)
 * @param {BoundedInteger<0,255>} blue blue level (0-255)
 * @param {BoundedInteger<0,255>=} alpha alpha level (0-255)
 * @returns {Color} Constructed color code (an integer)
 */
PhoneIoT.prototype.getColor = function (red, green, blue, alpha = 255) {
    return ((alpha & 0xff) << 24) | ((red & 0xff) << 16) | ((green & 0xff) << 8) | (blue & 0xff);
};

/**
 * Given a list of numbers representing a vector, this RPC returns the magnitude (length) of the vector.
 * This can be used to get the total acceleration from the accelerometer (which gives a vector).
 * 
 * @category Utility
 * @param {Array<Number>} vec the vector value
 * @returns {Number} magnitude of the vector (a non-negative number)
 */
PhoneIoT.prototype.magnitude = function(vec) { return common.magnitude(vec); };
/**
 * Given a list of numbers representing a vector, returns the normalized vector (same direction but with a magnitude of ``1.0``).
 * This is identical to dividing each component by the magnitude.
 * 
 * @category Utility
 * @param {Array<Number>} vec the vector value
 * @returns {Array<Number>} the normalized vector
 */
PhoneIoT.prototype.normalize = function(vec) { return common.normalize(vec); };

if (PHONE_IOT_MODE === 'native' || PHONE_IOT_MODE === 'both') {
    /* eslint-disable no-unused-vars */

    /**
     * Removes all controls from the device's canvas.
     * If you would instead like to remove a specific control, see :func:`PhoneIoT.removeControl`.
     * 
     * @category Display
     * @param {Device} device id of the device
     */
    PhoneIoT.prototype.clearControls = function (device) {
        return this._passToDevice('clearControls', arguments);
    };
    /**
     * Removes a control with the given ID if it exists.
     * If the control does not exist, does nothing (but still counts as success).
     * If you would instead like to remove all controls, see :func:`PhoneIoT.clearControls`.
     * 
     * @category Display
     * @param {Device} device id of the device
     * @param {String} id id of the control to remove
     */
    PhoneIoT.prototype.removeControl = function (device, id) {
        return this._passToDevice('removeControl', arguments);
    };
    /**
     * Adds a label control to the canvas at the given position.
     * If ``text`` is not specified, it default to empty, which can be used to hide the label when nothing needs to be displayed.
     * The text can be modified later via :func:`PhoneIoT.setText`.
     * 
     * Labels do not have a size, so they also don't do text wrapping.
     * Because of this, you should keep label text relatively short.
     * If you need a large amount of text written, consider using :func:`PhoneIoT.addTextField` with ``readonly = true``.
     * 
     * @category Display
     * @param {Device} device id of the device
     * @param {Position} x X position of the top left corner of the label (percentage).
     * @param {Position} y Y position of the top left corner of the label (percentage).
     * @param {String=} text The text to display on the label (defaults to empty)
     * @param {Object=} options Additional options
     * @param {String=} options.id The id to use for the control. If not specified, a new one will be automatically generated.
     * @param {Color=} options.textColor The text color of the label.
     * @param {Align=} options.align The text alignment to use. If set to ``left``, the text starts at the label position. If set to ``right``, the text ends at the label position. If set to ``center``, the text is centered on the label position.
     * @param {FontSize=} options.fontSize The size of the font to use for text (default ``1.0``).
     * @param {Boolean=} options.landscape If set to ``true``, rotates the label 90 degrees around the label position so the text appears upright when viewed in landscape.
     * @returns {String} id of the created control
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
     * Adds a button to the display with the given position and size.
     * If not specified, the default text for a button is empty, which can be used to just make a colored, unlabeled button.
     * The text can be modified later via :func:`PhoneIoT.setText`.
     * 
     * @category Display
     * @param {Device} device id of the device
     * @param {Position} x X position of the top left corner of the button (percentage)
     * @param {Position} y Y position of the top left corner of the button (percentage)
     * @param {Size} width Width of the button (percentage)
     * @param {Size} height Height of the button (percentage)
     * @param {String=} text text to display on the button (default empty)
     * @param {Object=} options Additional options
     * @param {String=} options.id The id to use for the control. If not specified, a new one will be automatically generated.
     * @param {String=} options.event The name of a message type to be sent each time the button is pressed. You must call :func:`PhoneIoT.listenToGUI` to actually receive these messages. If not specified, no event is sent. Message fields: ``id``.
     * @param {ButtonStyle=} options.style The display style of the button on the screen. This can be ``rectangle`` (default), ``ellipse``, ``square``, or ``circle``. If ``square`` or ``circle`` is used, the height of the control is ignored (height equals width).
     * @param {Color=} options.color The background color of the button.
     * @param {Color=} options.textColor The text color of the button.
     * @param {Boolean=} options.landscape If set to ``true``, rotates the button ``90`` degrees around its top left corner.
     * @param {FontSize=} options.fontSize The size of the font to use for text (default ``1.0``).
     * @returns {String} id of the created control
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
     * Adds an image display wit hthe given position and size.
     * If not specified, an image display is ``readonly``, meaning that the user cannot modify its content.
     * If (explicitly) not set to ``readonly``, then the user can click on the image display to change the image to a new picture from the camera.
     * 
     * @category Display
     * @param {Device} device id of the device
     * @param {Position} x X position of the top left corner of the image display (percentage).
     * @param {Position} y Y position of the top left corner of the image display (percentage).
     * @param {Size} width Width of the image display (percentage).
     * @param {Size} height Height of the image display (percentage).
     * @param {Object=} options Additional options
     * @param {String=} options.id The id to use for the control. If not specified, a new one will be automatically generated.
     * @param {String=} options.event The name of a message type to be sent each time the user updates the content (only possible if ``readonly = false``). You must call :func:`PhoneIoT.listenToGUI` to actually receive these messages. If not specified, no event is sent. Message fields: ``id``.
     * @param {Boolean=} options.readonly Specifies if the user is allowed to change the content (defaults to ``true``). Regardless of this setting, you can still modify the image programmatically via :func:`PhoneIoT.setImage`. Defaults to ``true``.
     * @param {Boolean=} options.landscape If set to ``true``, rotates the image display ``90`` degrees around its top left corner.
     * @param {Fit=} options.fit The technique used to fit the image into the display, in case the image and the display have different aspect ratios. This can be ``fit`` (default), ``zoom``, or ``stretch``.
     * @returns {String} id of the created control
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
     * Adds a text field to the canvas.
     * These are typically used to display large blocks of text, or to accept input text from the user.
     * If not set to ``readonly``, the user can click on the text field to change its content.
     * 
     * If you have a small amount of text you need to show and would otherwise make this control ``readonly``, consider using :func:`PhoneIoT.addLabel` instead.
     * 
     * @category Display
     * @param {Device} device id of the device
     * @param {Position} x X position of the top left corner of the text field (percentage).
     * @param {Position} y Y position of the top left corner of the text field (percentage).
     * @param {Size} width Width of the text field (percentage).
     * @param {Size} height Height of the text field (percentage).
     * @param {Object=} options Additional options
     * @param {String=} options.id The id to use for the control. If not specified, a new one will be automatically generated.
     * @param {String=} options.event The name of an event to send every time the user changes the text content (only possible if ``readonly = false``). Note that this event is only sent once the user clicks accept on the new content (you do not get an event for every key press). You must call :func:`PhoneIoT.listenToGUI` to actually receive these messages. If not specified, no event is sent. Message fields: ``id``, ``text``.
     * @param {String=} options.text This can be used to set the initial text of the text field once created. Defaults to empty if not specified.
     * @param {Color=} options.color The color of the text field border.
     * @param {Color=} options.textColor The text color of the text field.
     * @param {Boolean=} options.readonly If set to ``true``, the user will not be able to edit the content. However, you will still be free to do so programmatically. Defaults to ``false``.
     * @param {FontSize=} options.fontSize The size of the font to use for text (default ``1.0``).
     * @param {Align=} options.align The text alignment to use. This can be ``left`` (default), ``right``, or ``center``.
     * @param {Boolean=} options.landscape If set to ``true``, rotates the text field ``90`` degrees around its top left corner.
     * @returns {String} id of the created control
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
     * Adds a joystick control to the canvas at the given position and size.
     * No height parameter is given because joysticks are always circular (similar to passing ``style = circle`` to :func:`PhoneIoT.addButton`).
     * 
     * The position of the joystick is given by a vector ``[x, y]``, which is normalized to a length of 1.
     * If you would prefer to not have this normalization and want rectangular coordinates instead of circular, consider using :func:`PhoneIoT.addTouchpad` instead.
     * 
     * @category Display
     * @param {Device} device id of the device
     * @param {Position} x X position of the top left corner of the joystick (percentage).
     * @param {Position} y Y position of the top left corner of the joystick (percentage).
     * @param {Size} width Width of the joystick (percentage).
     * @param {Object=} options Additional options
     * @param {String=} options.id The id to use for the control. If not specified, a new one will be automatically generated.
     * @param {String=} options.event The name of a message type to be sent each time the user moves the joystick. The messages also include a ``tag`` field which functions identically to the one in :func:`PhoneIoT.addTouchpad`. You must call :func:`PhoneIoT.listenToGUI` to actually receive these messages. If not specified, no event is sent. Message fields: ``id``, ``x``, ``y``, ``tag``.
     * @param {Color=} options.color The color of the joystick.
     * @param {Boolean=} options.landscape If set to ``true``, the ``x`` and ``y`` values of the joystick are altered so that it acts correctly when in landscape mode. Unlike other controls, this option does not affect where the control is displayed on the screen (no rotation).
     * @returns {String} id of the created control
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
     * Adds a touchpad control to the canvas at the given position and size.
     * This control is similar to the joystick control, except that it is rectangular,
     * the vector is not normalized to a distance of 1,
     * the "stick" does not move back to ``(0, 0)`` upon letting go,
     * and there is an additional "tag" value denoting if each event was a touch ``down``, ``move``, or ``up``.
     * 
     * Although the vector value is not normalized to a length of 1,
     * each component (``x`` and ``y`` individually) is in ``[-1, 1]``.
     * 
     * @category Display
     * @param {Device} device id of the device
     * @param {Position} x X position of the top left corner of the touchpad (percentage).
     * @param {Position} y Y position of the top left corner of the touchpad (percentage).
     * @param {Size} width Width of the touchpad (percentage).
     * @param {Size} height Height of the touchpad (percentage).
     * @param {Object=} options Additional options
     * @param {String=} options.id The id to use for the control. If not specified, a new one will be automatically generated.
     * @param {String=} options.event The name of a message type to be sent each time the user touches, slides, or lets go of the touchpad. A message field called ``tag`` is included to differentiate the different types of interactions; it is one of ``down`` (touch started), ``up`` (touch ended), or ``move`` (during continued/held touch). You must call :func:`PhoneIoT.listenToGUI` to actually receive these messages. If not specified, no event is sent. Message fields: ``id``, ``x``, ``y``, ``tag``.
     * @param {Color=} options.color The color of the touchpad.
     * @param {TouchpadStyle=} options.style Controls the appearance of the touchpad. These are the same as for :func:`PhoneIoT.addButton` except that only ``rectangle`` and ``square`` are allowed.
     * @param {Boolean=} options.landscape ``true`` to rotate the control ``90`` degrees into landscape mode.
     * @returns {String} id of the created control
     */
    PhoneIoT.prototype.addTouchpad = function (device, x, y, width, height, options) {
        const DEFAULTS = {
            color: this.getColor(66, 135, 245),
            landscape: false,
            style: 0,
        };
        arguments[5] = _.merge({}, DEFAULTS, options);
        return this._passToDevice('addTouchpad', arguments);
    };
    /**
     * Adds a slider control to the display.
     * Sliders can be moved around to input or display any value in the range ``[0, 1]``.
     * If you need values outside of this range, you can do a little math to map them to ``[0, 1]`` or vice versa.
     * 
     * You can read and write the value of a slider with :func:`PhoneIoT.getLevel` and :func:`PhoneIoT.setLevel`.
     * Note that if the control is set to ``readonly``, the user cannot change the value, but you can still do so from code.
     * 
     * @category Display
     * @param {Device} device id of the device
     * @param {Position} x X position of the top left corner of the slider (percentage).
     * @param {Position} y Y position of the top left corner of the slider (percentage).
     * @param {Size} width Width (length) of the slider (percentage).
     * @param {Object=} options Additional options
     * @param {String=} options.id The id to use for the control. If not specified, a new one will be automatically generated.
     * @param {String=} options.event The name of a message type to be sent each time the user touches, slides, or lets go of the slider. The messages also include a ``tag`` field which functions identically to the one in :func:`PhoneIoT.addTouchpad`. You must call :func:`PhoneIoT.listenToGUI` to actually receive these messages. If not specified, no event is sent. Message fields: ``id``, ``level``, ``tag``.
     * @param {Color=} options.color The color of the slider.
     * @param {BoundedNumber<0,1>=} options.value The initial value of the slider (default ``0.0``).
     * @param {SliderStyle=} options.style Controls the appearance of the slider. Allowed values are ``slider`` (default) or ``progress``.
     * @param {Boolean=} options.landscape ``true`` to rotate the control ``90`` degrees into landscape mode.
     * @param {Boolean=} options.readonly ``true`` to disable the user from controlling the slider. This is especially usefull for progress bars.
     * @returns {String} id of the created control
     */
    PhoneIoT.prototype.addSlider = function (device, x, y, width, options) {
        const DEFAULTS = {
            color: this.getColor(66, 135, 245),
            landscape: false,
            readonly: false,
            style: 0,
            value: 0.0,
        };
        arguments[4] = _.merge({}, DEFAULTS, options);
        return this._passToDevice('addSlider', arguments);
    };
    /**
     * Adds a toggle control to the canvas at the given location.
     * The ``text`` parameter can be used to set the initial text shown for the toggle (defaults to empty),
     * but this can be changed later with :func:`PhoneIoT.setText`.
     * 
     * @category Display
     * @param {Device} device id of the device
     * @param {Position} x X position of the top left corner of the toggle (percentage).
     * @param {Position} y Y position of the top left corner of the toggle (percentage).
     * @param {String=} text The text to display next to the toggle (defaults to empty)
     * @param {Object=} options Additional options
     * @param {ToggleStyle=} options.style The visual style of the toggle control. This can be ``switch`` (default) for a mobile-style toggle, or ``checkbox`` for a desktop-style toggle.
     * @param {String=} options.id The id to use for the control. If not specified, a new one will be automatically generated.
     * @param {String=} options.event The name of a message to be sent every time the checkbox is toggled by the user. You must call :func:`PhoneIoT.listenToGUI` to actually receive these messages. Message fields: ``id``, ``state``.
     * @param {Boolean=} options.checked Defaults to ``false``. If set to ``true``, the toggle will be initially checked.
     * @param {Color=} options.color The color of the toggle itself.
     * @param {Color=} options.textColor The text color of the toggle.
     * @param {FontSize=} options.fontSize The size of the font to use for text (default ``1.0``). Note that this will also scale up the size of the toggle itself (not just the text).
     * @param {Boolean=} options.landscape If set to ``true``, rotates the toggle ``90`` degrees around its top left corner.
     * @param {Boolean=} options.readonly If set to ``true``, prevents the user from clicking the toggle. However, you will still be free to update the state programmatically. Defaults to ``false``.
     * @returns {String} id of the created control
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
     * Adds a radio button to the canvas.
     * Radio buttons are like toggles (checkboxes), except that they are organized into groups
     * and the user can check at most one radion button from any given group.
     * These can be used to accept multiple-choice input from the user.
     * 
     * @category Display
     * @param {Device} device id of the device
     * @param {Position} x X position of the top left corner of the radio button (percentage).
     * @param {Position} y Y position of the top left corner of the radio button (percentage).
     * @param {String=} text The text to display next to the checkbox (defaults to empty)
     * @param {Object=} options Additional options
     * @param {String=} options.group The name of the group to associate this radio button with. You do not need this value to access the control later. If not specified, defaults to ``main``.
     * @param {String=} options.id The id to use for the control. If not specified, a new one will be automatically generated.
     * @param {String=} options.event The name of an event to send every time the user clicks the radio button. Note that clicking a radio button always checks it, unlike toggles. You must call :func:`PhoneIoT.listenToGUI` to actually receive these messages. If not specified, no event is sent. Message fields: ``id``, ``state``.
     * @param {Boolean=} options.checked Defaults to ``false``. If set to ``true``, the radio button will be initially checked. Note that, while the user cannot check multiple radio buttons, you are free to do so programmatically.
     * @param {Color=} options.color The color of the radio button itself.
     * @param {Color=} options.textColor The text color of the radio button.
     * @param {FontSize=} options.fontSize The size of the font to use for text (default ``1.0``). Note that this will also scale up the size of the radio button itself (not just the text).
     * @param {Boolean=} options.landscape If set to ``true``, rotates the radio button ``90`` degrees around its top left corner.
     * @param {Boolean=} options.readonly If set to ``true``, prevents the user from clicking the radio button. However, you will still be free to update the state programmatically. Defaults to ``false``.
     * @returns {String} id of the created control
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
     * Sets the text content of the text-like control with the given ID.
     * This can be used on any control that has text, such as a button, label, or text field.
     * 
     * @category Display
     * @param {Device} device id of the device
     * @param {String} id id of the control to modify
     * @param {String=} text The new text to display (defaults to empty)
     */
    PhoneIoT.prototype.setText = function (device, id, text='') {
        arguments[2] = text;
        return this._passToDevice('setText', arguments);
    };
    /**
     * Gets the current text content of the text-like control with the given ID.
     * This can be used on any control that has text, such as a button, label, or text field.
     * 
     * @category Display
     * @param {Device} device id of the device
     * @param {String} id id of the control to read
     * @returns {String} currently displayed text
     */
    PhoneIoT.prototype.getText = function (device, id) {
        return this._passToDevice('getText', arguments);
    };
    /**
     * Gets the current ``x`` and ``y`` values for the current position of a positional control.
     * This does *not* give the location of the control on the screen.
     * Positional controls are controls whose primary interaction is through position.
     * For instance, this is used for both joystick and touchpad controls.
     * 
     * For a joystick, this always returns a vector normalized to a length of ``1.0``.
     * If the user is not touching the joystick, it will automatically go back to the center, ``[0, 0]``.
     * 
     * For a touchpad, this will either give you the current location of the touch (a list of ``[x, y]``)
     * or an error if the user is not touching the screen.
     * 
     * If you want to get the value of a slider, use :func:`PhoneIoT.getLevel` instead.
     * 
     * Instead of calling this in a loop, it is likely better to use the ``event`` optional parameter of
     * :func:`PhoneIoT.addJoystick` or :func:`PhoneIoT.addTouchpad`.
     * 
     * @category Display
     * @param {Device} device id of the device
     * @param {String} id id of the control to read
     * @returns {Array<BoundedNumber<-1,1>>} a list of ``[x, y]`` for the current position, or a ``string`` explaining that there is no current position
     */
    PhoneIoT.prototype.getPosition = function (device, id) {
        return this._passToDevice('getPosition', arguments);
    };
    /**
     * Get the current value (a single number) of a value-like control.
     * Currently, the only supported control is a slider, which returns a value in ``[0, 1]``.
     * 
     * Instead of calling this in a loop, it is likely better to use the ``event`` optional parameter of :func:`PhoneIoT.addSlider`.
     * 
     * If you want to get the cursor position of a joystick or touchpad, use :func:`PhoneIoT.getPosition` instead.
     * 
     * @category Display
     * @param {Device} device id of the device
     * @param {String} id id of the control to read
     * @returns {BoundedNumber<0,1>} current value
     */
    PhoneIoT.prototype.getLevel = function (device, id) {
        return this._passToDevice('getLevel', arguments);
    };
    /**
     * Set the current value (a single number) of a value-like control.
     * Currently, the only supported control is a slider, which sets the displayed value.
     * 
     * Note that you can use this RPC even if the control is set to ``readonly`` mode (it's only readonly to the user).
     * 
     * @category Display
     * @param {Device} device id of the device
     * @param {String} id id of the control to read
     * @param {BoundedNumber<0,1>} value new value to set
     * @returns {Number} current value
     */
    PhoneIoT.prototype.setLevel = function (device, id, value) {
        return this._passToDevice('setLevel', arguments);
    };
    /**
     * @deprecated
     * @param {Device} device
     * @param {String} id
     * @returns {Array}
     */
    PhoneIoT.prototype.getJoystickVector = PhoneIoT.prototype.getPosition;
    /**
     * This RPC simply checks that the connection to the device is still good.
     * In particular, you can use this to check if the password is still valid.
     * 
     * @param {Device} device id of the device
     */
    PhoneIoT.prototype.authenticate = async function (device) {
        return this._passToDevice('authenticate', arguments);
    };
    /**
     * This RPC requests that you receive any events from the *Graphical User Interface* (GUI) on the phone's display.
     * This is needed to receive any type of GUI event, including button clicks, joystick movements, and textbox update events.
     * You only need to call this RPC once, which you can do at the start of your program (but after calling :func:`PhoneIoT.setCredentials`).
     * 
     * See the :doc:`Display` section for more information.
     * 
     * @param {Device} device id of the device
     */
    PhoneIoT.prototype.listenToGUI = async function (device) {
        await this.authenticate(device); // throws on failure - we want this
        
        device.guiListeners[this.socket.clientId] = this.socket;
    };
    /**
     * This RPC requests that you receive periodic sensor update events from the device.
     * The ``sensors`` input is a list of pairs (lists of length 2), where each pair is a sensor name and an update period in milliseconds.
     * You can have different update periods for different sensors.
     * You will receive a message of the same name as the sensor at most once per whatever update period you specified.
     * Any call to this RPC will invalidate all previous calls - thus, calling it with an empty list will stop all updates.
     * 
     * This method of accessing sensor data is often easier, as it doesn't require loops or error-checking code.
     * If a networking error occurs, you simply miss that single message.
     * 
     * The :func:`PhoneIoT.getSensors` RPC can be used to get a list of the valid sensor names.
     * See the :doc:`Sensors` section for more information, esp. the required fields for each message type.
     * 
     * @param {Device} device id of the device
     * @param {Object=} sensors structured data representing the minimum time in milliseconds between updates for each sensor type to listen for
     * @param {SensorPeriod=} sensors.gravity ``gravity`` period
     * @param {SensorPeriod=} sensors.gyroscope ``gyroscope`` period
     * @param {SensorPeriod=} sensors.orientation ``orientation`` period
     * @param {SensorPeriod=} sensors.accelerometer ``accelerometer`` period
     * @param {SensorPeriod=} sensors.magneticField ``magneticField`` period
     * @param {SensorPeriod=} sensors.rotation @deprecated ``rotation`` period
     * @param {SensorPeriod=} sensors.linearAcceleration ``linearAcceleration`` period
     * @param {SensorPeriod=} sensors.gameRotation @deprecated ``gameRotation`` sensor period
     * @param {SensorPeriod=} sensors.lightLevel ``lightLevel`` period
     * @param {SensorPeriod=} sensors.microphoneLevel ``microphoneLevel`` period
     * @param {SensorPeriod=} sensors.proximity ``proximity`` period
     * @param {SensorPeriod=} sensors.stepCount ``stepCount`` period
     * @param {SensorPeriod=} sensors.location ``location`` period
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
     * This RPC returns a list containing the name of every sensor supported by PhoneIoT.
     * Note that your specific device might not support all of these sensors, depending on the model.
     * 
     * See :doc:`Sensors` for more information.
     * 
     * @category Utility
     * @returns {Array} A list of sensor names
     */
    PhoneIoT.prototype.getSensors = function () {
        return Object.keys(common.SENSOR_PACKERS).filter(s => !common.DEPRECATED_SENSORS.has(s));
    };
    /**
     * This is the first RPC you should *always* call when working with PhoneIoT.
     * It sets the login credentials (password) to use for all future interactions with the device.
     * 
     * @param {Device} device id of the device
     * @param {String} password the password to use for accessing the device
     */
    PhoneIoT.prototype.setCredentials = async function (device, password) {
        device.credentials[this.socket.clientId] = password;
    };

    /**
     * Checks if the pressable control with the given ID is currently pressed.
     * This can be used on any pressable control, which currently includes buttons, joysticks, and touchpads.
     * 
     * By calling this RPC in a loop, you could perform some action every second while a button is held down.
     * If you would instead like to receive click events, see the ``event`` optional parameter of :func:`PhoneIoT.addButton`.
     * 
     * @category Display
     * @param {Device} device id of the device
     * @param {String} id id of the control to read
     * @returns {Boolean} ``true`` for pressed, otherwise ``false``
     */
    PhoneIoT.prototype.isPressed = function (device, id) {
        return this._passToDevice('isPressed', arguments);
    };

    /**
     * Gets the toggle state of a toggleable control.
     * This can be used on any toggleable control, such as toggles and radio buttons.
     * 
     * @category Display
     * @param {Device} device id of the device
     * @param {String} id id of the control to read
     * @returns {Boolean} ``true`` for checked, otherwise ``false``
     */
    PhoneIoT.prototype.getToggleState = function (device, id) {
        return this._passToDevice('getToggleState', arguments);
    };
    /**
     * Sets the toggle state of a toggleable control with the given ID.
     * This can be used on any toggleable control, such as toggles and radio buttons.
     * If ``state`` is ``true``, the toggleable becomes checked, otherwise it is unchecked.
     * 
     * If used on a radio button, it sets the state independent of the control's group.
     * That is, although the user can't select multiple radio buttons in the same group, you can do so programmatically through this RPC.
     * 
     * @category Display
     * @param {Device} device id of the device
     * @param {String} id id of the control to modify
     * @param {Boolean} state new value for the toggle state
     */
    PhoneIoT.prototype.setToggleState = function (device, id, state) {
        return this._passToDevice('setToggleState', arguments);
    };

    /**
     * Gets the current output of the orientation sensor, relative to Earth's magnetic reference frame.
     * This is given as a vector (list) with three angular components (in degrees):
     * 
     * - azimuth (effectively the compass heading) ``[-180, 180]``
     * - pitch (vertical tilt) ``[-90, 90]``
     * - roll ``[-180, 180]``
     * 
     * If you are getting inconsistent values for the first (azimuth) angle,
     * try moving and rotating your device around in a figure-8 to recalibrate it.
     * 
     * Sensor name: ``orientation``
     * 
     * Message fields: ``x``, ``y``, ``z``, ``heading``, ``dir``, ``cardinalDir``, ``device``
     * 
     * @category Sensors
     * @param {Device} device id of the device
     * @returns {Array} the current orientation vector
     */
    PhoneIoT.prototype.getOrientation = function (device) {
        return this._passToDevice('getOrientation', arguments);
    };
    /**
     * Gets the current compass heading from the device. This is similar to :func:`PhoneIoT.getBearing`, except that it returns the angle from magnetic north, rather than the direction of travel.
     * This is provided by the magnetic field sensor, so using this RPC on devices without a magnetometer will result in an error.
     * The output of this RPC assumes the device is face-up.
     * 
     * If you are getting inconsistent values, try moving and rotating your device around in a figure-8 to recalibrate it.
     * 
     * Sensor name: ``orientation``
     * 
     * Message fields: ``x``, ``y``, ``z``, ``heading``, ``dir``, ``cardinalDir``, ``device``
     * 
     * @category Sensors
     * @param {Device} device id of the device
     * @returns {Number} the compass heading (in degrees)
     */
    PhoneIoT.prototype.getCompassHeading = function (device) {
        return this._passToDevice('getCompassHeading', arguments);
    };
    /**
     * Returns the current compass direction of the device, which is one of ``N``, ``NE``, ``E``, ``SE``, ``S``, ``SW``, ``W``, or ``NW``.
     * This is provided by the magnetic field sensor, so using this RPC on devices without a magnetometer will result in an error.
     * The output of this RPC assumes the device is face-up.
     * 
     * If you are getting inconsistent values, try moving and rotating your device around in a figure-8 to recalibrate it.
     * 
     * Sensor name: ``orientation``
     * 
     * Message fields: ``x``, ``y``, ``z``, ``heading``, ``dir``, ``cardinalDir``, ``device``
     * 
     * @category Sensors
     * @param {Device} device id of the device
     * @returns {String} the current compass direction name
     */
    PhoneIoT.prototype.getCompassDirection = function (device) {
        return this._passToDevice('getCompassDirection', arguments);
    };
    /**
     * Equivalent to :func:`PhoneIoT.getCompassDirection`, except that it only returns ``N``, ``E``, ``S``, or ``W``.
     * 
     * If you are getting inconsistent values, try moving and rotating your device around in a figure-8 to recalibrate it.
     * 
     * Sensor name: ``orientation``
     * 
     * Message fields: ``x``, ``y``, ``z``, ``heading``, ``dir``, ``cardinalDir``, ``device``
     * 
     * @category Sensors
     * @param {Device} device id of the device
     * @returns {String} the compass cardinal direction name
     */
    PhoneIoT.prototype.getCompassCardinalDirection = function (device) {
        return this._passToDevice('getCompassCardinalDirection', arguments);
    };

    /**
     * Gets the current output of the accelerometer sensor, if the device supports it.
     * This is a vector representing the acceleration along the ``x``, ``y``, and ``z`` axes, relative to the device.
     * When at rest, you can expect to measure the acceleration due to gravity.
     * 
     * Sensor name: ``accelerometer``
     * 
     * Message fields: ``x``, ``y``, ``z``, ``facingDir``, ``device``
     * 
     * @category Sensors
     * @param {Device} device id of the device
     * @returns {Array} current acceleration vector
     */
    PhoneIoT.prototype.getAccelerometer = function (device) {
        return this._passToDevice('getAccelerometer', arguments);
    };
    /**
     * Attempts to determine the general orientation of the device based on the accelerometer output.
     * This represents which direction the face of the device's screen is pointing.
     * The possible values are:
     * 
     * - ``up`` - the device is face up
     * - ``down`` - the device is face down
     * - ``vertical`` - the device is upright
     * - ``upside down`` - the device is vertical, but upside down
     * - ``left`` - the device is horizontal, lying on its left side (when facing the screen)
     * - ``right`` - the device is horizontal, lying on its right side (when facing the screen)
     * 
     * Sensor name: ``accelerometer``
     * 
     * Message fields: ``x``, ``y``, ``z``, ``facingDir``, ``device``
     * 
     * @category Sensors
     * @param {Device} device id of the device
     * @returns {String} name of the facing direction
     */
    PhoneIoT.prototype.getFacingDirection = function (device) {
        return this._passToDevice('getFacingDirection', arguments);
    };

    /**
     * Attempts to get the gravity acceleration angle, divorced from any linear acceleration the device might be experiencing.
     * For example, even if you start running, this vector should always have roughly the same value.
     * This is provided by a hybrid sensor, and is not available on all devices.
     * 
     * The counterpart to this RPC is :func:`PhoneIoT.getLinearAcceleration`.
     * 
     * Sensor name: ``gravity``
     * 
     * Message fields: ``x``, ``y``, ``z``, ``device``
     * 
     * @category Sensors
     * @param {Device} device id of the device
     * @returns {Array} gravitational acceleration vector
     */
    PhoneIoT.prototype.getGravity = function (device) {
        return this._passToDevice('getGravity', arguments);
    };

    /**
     * This RPC attempts to get the linear acceleration vector, divorced from the constant gravitational acceleration.
     * Theoretically, if the device is at rest this RPC would report a nearly-zero vector (nothing is ever perfectly still).
     * This is provided by a hybrid sensor, and is not available on all devices.
     * 
     * The counterpart to this RPC is :func:`PhoneIoT.getGravity`.
     * 
     * Sensor name: ``linearAcceleration``
     * 
     * Message fields: ``x``, ``y``, ``z``, ``device``
     * 
     * @category Sensors
     * @param {Device} device id of the device
     * @returns {Array} current linear acceleration vector
     */
    PhoneIoT.prototype.getLinearAcceleration = function (device) {
        return this._passToDevice('getLinearAcceleration', arguments);
    };

    /**
     * Gets the current output of the gyroscope sensor, which measures rotational acceleration (in degress/s²) along the three axes of the device.
     * 
     * Sensor name: ``gyroscope``
     * 
     * Message fields: ``x``, ``y``, ``z``, ``device``
     * 
     * @category Sensors
     * @param {Device} device id of the device
     * @returns {Array} rotational acceleration vector
     */
    PhoneIoT.prototype.getGyroscope = function (device) {
        return this._passToDevice('getGyroscope', arguments);
    };
    /**
     * Gets the current output of the rotation sensor.
     * This is a 4D rotation vector, given as rotation along 3 axes, plus a scalar component.
     * This is provided in case it is needed, but in practice, it's typically easier to use 3D quantities, as provided by :func:`PhoneIoT.getOrientation`.
     * 
     * Sensor name: ``rotation``
     * 
     * Message fields: ``x``, ``y``, ``z``, ``w``, ``device``
     * 
     * @deprecated
     * @category Sensors
     * @param {Device} device id of the device
     * @returns {Array} 4D rotational vector
     */
    PhoneIoT.prototype.getRotation = function (device) {
        return this._passToDevice('getRotation', arguments);
    };
    /**
     * Equivalent to the :func:`PhoneIoT.getOrientation` RPC except that it gets the orientation relative to a fixed reference frame, thus making it good for use in games.
     * 
     * Sensor name: ``gameRotation``
     * 
     * Message fields: ``x``, ``y``, ``z``, ``device``
     * 
     * @deprecated
     * @category Sensors
     * @param {Device} device id of the device
     * @returns {Array} 3D rotational vector
     */
    PhoneIoT.prototype.getGameRotation = function (device) {
        return this._passToDevice('getGameRotation', arguments);
    };

    /**
     * Gets the current ouput of the magnetic field sensor, measured in μT (micro Tesla) along each axis of the device.
     * This is provided by the magnetic field sensor, so using this RPC on devices without a magnetometer will result in an error.
     * 
     * Notably, this RPC can be used as a compass (measuring Earth's magnetic field).
     * 
     * Sensor name: ``magneticField``
     * 
     * Message fields: ``x``, ``y``, ``z``, ``device``
     * 
     * @category Sensors
     * @param {Device} device id of the device
     * @returns {Array} magnetic field vector
     */
    PhoneIoT.prototype.getMagneticField = function (device) {
        return this._passToDevice('getMagneticField', arguments);
    };

    /**
     * Gets the current level (volume) of the microphone on the device.
     * This is specified as a number where ``0.0`` denotes silence and ``1.0`` is the maximum volume the microphone can record.
     * 
     * Sensor name: ``microphoneLevel``
     * 
     * Message fields: ``volume``, ``device``
     * 
     * @category Sensors
     * @param {Device} device id of the device
     * @returns {Array} the current volume level
     */
    PhoneIoT.prototype.getMicrophoneLevel = function (device) {
        return this._passToDevice('getMicrophoneLevel', arguments);
    };

    /**
     * Gets the current location of the device, specified as latitude and longitude coordinates (in degrees).
     * This is provided by the location service on the device, so you must have location turned on and give the app permission.
     * 
     * Sensor name: ``location``
     * 
     * Message fields: ``latitude``, ``longitude``, ``bearing``, ``altitude``, ``device``
     * 
     * @category Sensors
     * @param {Device} device id of the device
     * @returns {Array} a list containing the latitude and longitude
     */
    PhoneIoT.prototype.getLocation = function (device) {
        return this._passToDevice('getLocation', arguments);
    };
    /**
     * Returns the current bearing (direction of travel) from the device.
     * This is provided by the location sensor, so you must have location turned on and give the app permission.
     * The bearing is expressed as the angle (in degrees) from North, going clockwise.
     * Thus, you can directly use this value in a ``point in direction`` block to point a sprite in the direction of travel (assuming North is up).
     * 
     * Sensor name: ``location``
     * 
     * Message fields: ``latitude``, ``longitude``, ``bearing``, ``altitude``, ``device``
     * 
     * @category Sensors
     * @param {Device} device id of the device
     * @returns {Number} current bearing (in degrees)
     */
    PhoneIoT.prototype.getBearing = function (device) {
        return this._passToDevice('getBearing', arguments);
    };
    /**
     * Returns the current altitude of the device, expressed in meters above sea level.
     * This is provided by the location service on the device, so you must have location turned on and give the app permission.
     * 
     * Sensor name: ``location``
     * 
     * Message fields: ``latitude``, ``longitude``, ``bearing``, ``altitude``, ``device``
     * 
     * @category Sensors
     * @param {Device} device id of the device
     * @returns {Number} current altitude in meters
     */
    PhoneIoT.prototype.getAltitude = function (device) {
        return this._passToDevice('getAltitude', arguments);
    };

    /**
     * Gets the current output of the proximity (distance) sensor, measured in cm.
     * Phones typically have this sensor for turning off the display when you put it to your ear, but tablets typically do not.
     * In any case, the distances are not typically very long, and some devices only have binary (near/far) sensors.
     * 
     * Sensor name: ``proximity``
     * 
     * Message fields: ``distance``, ``device``
     * 
     * @category Sensors
     * @param {Device} device id of the device
     * @returns {Number} current proximity sensor output
     */
    PhoneIoT.prototype.getProximity = function (device) {
        return this._passToDevice('getProximity', arguments);
    };
    /**
     * Gets the current step count from the device's step counter sensor.
     * Not all devices have a step counter sensor, but you can manually emulate one by using the accelerometer.
     * 
     * Sensor name: ``stepCount``
     * 
     * Message fields: ``count``, ``device``
     * 
     * @category Sensors
     * @param {Device} device id of the device
     * @returns {Number} current step count
     */
    PhoneIoT.prototype.getStepCount = function (device) {
        return this._passToDevice('getStepCount', arguments);
    };
    /**
     * Gets the current light level from the device.
     * This is represented as a number with higher values being brighter.
     * 
     * Sensor name: ``lightLevel``
     * 
     * Message fields: ``value``, ``device``
     * 
     * @category Sensors
     * @param {Device} device id of the device
     * @returns {Number} current light level
     */
    PhoneIoT.prototype.getLightLevel = function (device) {
        return this._passToDevice('getLightLevel', arguments);
    };

    /**
     * Gets the displayed image of an image-like control with the given ID.
     * This can be used on any control that displays images, which is currently only image displays.
     * 
     * This can be used to retrieve images from the mobile device's camera, by having the user store an image in an image display that has ``readonly = false``.
     * See the ``readonly`` optional parameter of :func:`PhoneIoT.addImageDisplay`.
     * 
     * @category Display
     * @param {Device} device id of the device
     * @param {String} id id of the image display
     * @returns {Image} the displayed image
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
     * Sets the displayed image of an image-like control with the given ID.
     * This can be used on any control that displays images, which is currently only image displays.
     * 
     * @category Display
     * @param {Device} device id of the device
     * @param {String} id the id of the control to modify
     * @param {Image} img the new image to display
     */
    PhoneIoT.prototype.setImage = function (device, id, img) {
        return this._passToDevice('setImage', arguments);
    };

    // /**
    //  * Sets the total message limit for the given device.
    //  * @param {Device} device id of the device
    //  * @param {Number} rate number of messages per seconds
    //  * @returns {Boolean} True if the device was found
    //  */
    // PhoneIoT.prototype.setTotalRate = function (device, rate) {
    //     return this._passToDevice('setTotalRate', arguments);
    // };

    // /**
    //  * Sets the client message limit and penalty for the given device.
    //  * @param {Device} device id of the device
    //  * @param {Number} rate number of messages per seconds
    //  * @param {Number} penalty number seconds of penalty if rate is violated
    //  * @returns {Boolean} True if the device was found
    //  */
    // PhoneIoT.prototype.setClientRate = function (device, rate, penalty) {
    //     return this._passToDevice('setClientRate', arguments);
    // };
    /* eslint-enable no-unused-vars */
}

if (PHONE_IOT_MODE === 'security' || PHONE_IOT_MODE === 'both') {
    // /**
    //  * Sends a textual command to the device
    //  * @param {Device} device id of the device
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
PhoneIoT.initialize = function () {
    console.log('PHONE_IOT_PORT is ' + process.env.PHONE_IOT_PORT);
    server.bind(process.env.PHONE_IOT_PORT || 1976);

    setTimeout(PhoneIoT.prototype._heartbeat, 1000);
};

PhoneIoT.isSupported = function () {
    if (!process.env.PHONE_IOT_PORT) {
        console.log('PHONE_IOT_PORT is not set (to 1976), PhoneIoT is disabled');
    }
    return !!process.env.PHONE_IOT_PORT;
};

module.exports = PhoneIoT;

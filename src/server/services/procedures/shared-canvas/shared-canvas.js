/**
 * SharedCanvas is a service that lets all NetsBlox users view and edit a shared canvas (image).
 * Users can view the canvas, or edit it pixel by pixel.
 * However, there is a cooldown between canvas edits, meaning one user cannot dominate the entire canvas.
 *
 * SharedCanvas was inspired by `Place <https://en.wikipedia.org/wiki/Place_(Reddit)>`__, which was
 * a social experiment started on Reddit that functioned in much the same way. Place came to capture
 * Reddit's online culture through the combined efforts of many users striving to control the canvas
 * and display their own images.
 *
 * @alpha
 * @service
 */
'use strict';

const logger = require('../utils/logger')('shared-canvas');
const utils = require('../utils');
const jimp = require('jimp');
const { getCanvas, saveCanvas, getImageBuf, getUser, EDIT_COOLDOWN } = require('./storage');
const { defineTypes } = require('./types');

defineTypes();

const UPDATE_INTERVAL = 60 * 1000; // ms
let canvasChanged = false;
async function _saveLoop() {
    try {
        if (canvasChanged) {
            logger.info('saving canvas');
            await saveCanvas();
        }
        else {
            logger.info('saving canvas - no changes to save...');
        }
    } catch (e) {
        logger.error(`canvas save error: ${e}`);
    }
    setTimeout(_saveLoop, UPDATE_INTERVAL);
}
setTimeout(_saveLoop, UPDATE_INTERVAL);

const SharedCanvas = {};

/**
 * Gets the color of the specified pixel in the image.
 *
 * @param {SharedCanvasX} x X coordinate of the pixel to read.
 * @param {SharedCanvasY} y Y coordinate of the pixel to read.
 * @returns {SharedCanvasColor} The pixel color at the given location.
 */
SharedCanvas.getPixel = async function (x, y) {
    const canvas = await getCanvas();
    const { r, g, b } = jimp.intToRGBA(canvas.getPixelColor(x, y));
    return [ r, g, b ];
};

/**
 * Sets the color of the specified pixel in the image.
 *
 * After making an edit, your account is placed in a cooldown mode where no other edits can be made for a short period.
 * If you are not signed in, you will be counted as a special guest account, which all share the same cooldown timer.
 * Because of this, it is advised to sign in before using this service, esp. if you want to make many edits.
 *
 * @param {SharedCanvasX} x X coordinate of the pixel to read.
 * @param {SharedCanvasY} y Y coordinate of the pixel to read.
 * @param {SharedCanvasColor} color The new color to set at the given location.
 * @returns {Boolean} ``true`` if the edit was successful, otherwise ``false`` (attempt to edit during cooldown).
 */
SharedCanvas.setPixel = async function (x, y, color) {
    const user = await getUser(this.caller);
    if (!user.canEdit()) return false;
    user.markEdit();

    const canvas = await getCanvas();
    const [ r, g, b ] = color;
    canvas.setPixelColor(jimp.rgbaToInt(r, g, b, 255), x, y);
    canvasChanged = true; // mark this change so we'll trigger a save on the next save cycle

    return true;
};

/**
 * Gets the amount of cooldown time remaining (in seconds) before the next edit can be made on this account.
 * If this is ``0``, then the cooldown has expired and you can make your next edit.
 *
 * @returns {BoundedNumber<0>} Remaining cooldown time (in seconds), or ``0`` if no cooldown remaining.
 */
SharedCanvas.getCooldownRemaining = async function () {
    const user = await getUser(this.caller);
    return Math.max(user.msTillCooldown() / 1000, 0);
};

/**
 * Gets the edit cooldown time (in seconds) that is imposed after each edit.
 * 
 * @returns {BoundedNumber<0>} Edit cooldown (in seconds).
 */
SharedCanvas.getCooldown = function () {
    return EDIT_COOLDOWN / 1000;
};

/**
 * Gets the total number of edits that have been made (successfully) on this account.
 *
 * @returns {BoundedInteger<0>} Total number of edits that have been made on this account.
 */
SharedCanvas.getEditCount = async function () {
    const user = await getUser(this.caller);
    return user.numEdits;
};

/**
 * Gets the current canvas size.
 *
 * @returns {Tuple<BoundedInteger<1>,BoundedInteger<1>>} The width and height of the canvas, as a list.
 */
SharedCanvas.getSize = async function () {
    const canvas = await getCanvas();
    return [canvas.bitmap.width, canvas.bitmap.height];
};
/**
 * Gets the current canvas width.
 *
 * @returns {BoundedInteger<1>} The canvas width.
 */
SharedCanvas.getWidth = async function () { return (await this.getSize())[0]; };
/**
 * Gets the current canvas height.
 *
 * @returns {BoundedInteger<1>} The canvas height.
 */
SharedCanvas.getHeight = async function () { return (await this.getSize())[1]; };

/**
 * Gets a snapshot of the current canvas as an image.
 * The arguments to this function can be used to retrieve a specific region of the canvas,
 * or they can all be omitted to grab a snapshot of the entire canvas.
 *
 * @param {SharedCanvasX=} x X position of the top left corner to grab (default ``0``).
 * @param {SharedCanvasY=} y Y position of the top left corner to grab (default ``0``).
 * @param {BoundedInteger<1>=} width Width of the returned image to grab (default goes all the way to the right).
 * @param {BoundedInteger<1>=} height Height of the returned image to grab (default goes all the way to the bottom).
 * @param {BoundedInteger<1>=} scale Zoom scale of the returned image (final size cannot be larger than the full canvas) (default ``1``).
 * @returns {Image} The requested slice of the current canvas as an image.
 */
SharedCanvas.getImage = async function (x = 0, y = 0, width, height, scale = 1) {
    const canvas = await getCanvas();
    if (!width) width = canvas.bitmap.width - x;
    if (!height) height = canvas.bitmap.height - y;

    if (x + width > canvas.bitmap.width) throw Error(`X position ${x} with width ${width} extends beyond the canvas width (${canvas.bitmap.width})`);
    if (y + height > canvas.bitmap.height) throw Error(`Y position ${y} with height ${height} extends beyond the canvas height (${canvas.bitmap.height})`);

    if (width * scale > canvas.bitmap.width) throw Error(`Scaled image width (${width * scale}) exceeds full canvas width (${canvas.bitmap.width})`);
    if (height * scale > canvas.bitmap.height) throw Error(`Scaled image height (${height * scale}) exceeds full canvas height (${canvas.bitmap.height})`);

    const img = canvas.clone().crop(x - 0.5, y - 0.5, width, height).scale(scale, jimp.RESIZE_NEAREST_NEIGHBOR);
    return utils.sendImageBuffer(this.response, await getImageBuf(img));
};

module.exports = SharedCanvas;

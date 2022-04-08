/**
 * SharedCanvas is a service that lets all NetsBlox users view and edit a shared canvas (image).
 * SharedCanvas lets users view the shared canvas, or edit it pixel by pixel.
 * However, editing the canvas requires you to be signed into NetsBlox,
 * and there is a cooldown before you can edit additional pixels.
 *
 * SharedCanvas was inspired by `<Place> https://en.wikipedia.org/wiki/Place_(Reddit)`__, which was
 * a social experiment started on Reddit that functioned in much the same way and came to capture
 * Reddit's online culture.
 *
 * @alpha
 * @service
 */
'use strict';

const logger = require('../utils/logger')('shared-canvas');
const utils = require('../utils');
const jimp = require('jimp');
const { getCanvas, saveCanvas, getImageBuf } = require('./storage');
const { defineTypes } = require('./types');

defineTypes();

const UPDATE_INTERVAL = 30 * 1000; // ms
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
 * Gets the color of the specific pixel in the image.
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
 * Sets the color of the specific pixel in the image.
 *
 * @param {SharedCanvasX} x X coordinate of the pixel to read.
 * @param {SharedCanvasY} y Y coordinate of the pixel to read.
 * @param {SharedCanvasColor} color The new color to set at the given location.
 */
SharedCanvas.setPixel = async function (x, y, color) {
    const canvas = await getCanvas();
    const [ r, g, b ] = color;
    canvas.setPixelColor(jimp.rgbaToInt(r, g, b, 255), x, y);
    canvasChanged = true; // mark this change so we'll trigger a save on the next save cycle
};

/**
 * Gets the current canvas size.
 *
 * @returns {Array<Integer>} The width and height of the canvas as a list.
 */
SharedCanvas.getSize = async function () {
    const canvas = await getCanvas();
    return [canvas.bitmap.width, canvas.bitmap.height];
};
/**
 * Gets the current canvas width.
 *
 * @returns {Integer} The canvas width.
 */
SharedCanvas.getWidth = async function () { return (await this.getSize())[0]; };
/**
 * Gets the current canvas height.
 *
 * @returns {Integer} The canvas height.
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

    const img = canvas.clone().crop(x - 0.5, y - 0.5, width, height).resize(width * scale, height * scale, jimp.RESIZE_NEAREST_NEIGHBOR);
    return utils.sendImageBuffer(this.response, await getImageBuf(img));
};

module.exports = SharedCanvas;

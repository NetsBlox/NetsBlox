/**
 * This service provides access to the `RainViewer <https://www.rainviewer.com/api.html>`__ aggregated database.
 * RainViewer provides access to recent and forecasted weather radar maps all around the world.
 *
 * @alpha
 * @service
 * @category Science
 * @category Climate
 */

const logger = require('../utils/logger')('rain-viewer');
const GoogleMaps = require('../google-maps/google-maps');
const ApiConsumer = require('../utils/api-consumer');
const jimp = require('jimp');
const _ = require('lodash');

const { defineTypes, TIME_OFFSETS, COLOR_SCHEMES } = require('./types');
defineTypes();

const RainViewer = new ApiConsumer('RainViewer', '', { cache: { ttl: 5 * 60 } }); // radar data updates every 10 minutes (or so)

function decimalize(val) {
    const str = val.toString();
    return str.includes('.') ? str : `${str}.0`;
}

/**
 * Get the list of valid radar time offsets for the :func:`RainViewer.getOverlay` RPC.
 * The returned time offsets are in chronological order.
 *
 * @returns {Array<TimeOffset>} The list of valid time offsets in chronological order.
 */
RainViewer.getTimeOffsets = function () {
    return Object.keys(TIME_OFFSETS);
};

/**
 * Get the list of valid color schemes for the :func:`RainViewer.getOverlay` RPC.
 *
 * @returns {Array<ColorScheme>} The list of valid color schemes.
 */
RainViewer.getColorSchemes = function () {
    return Object.keys(COLOR_SCHEMES);
};

/**
 * Gets a transparent overlay that can be placed directly on to of a map provided by :func:`GoogleMaps.getMap`
 * to display recent or forecasted weather radar data.
 *
 * @param {Latitude} latitude Latitude of the returned map (centered).
 * @param {Longitude} longitude Longitude of the returned map (centered).
 * @param {BoundedInteger<1>} width Width (in pixels) of the returned map.
 * @param {BoundedInteger<1>} height Height (in pixels) of the returned map.
 * @param {BoundedInteger<1,25>} zoom The zoom level of the returned image (see the :doc:`/service/GoogleMaps/index` service).
 * @param {TimeOffset=} timeOffset The time offset of the desired forecast (defaults to ``now``, which represents current weather).
 * @param {Object=} options Additional drawing options.
 * @param {Boolean=} options.smooth If set to true, smooths the radar overlay in the returned image to be more aesthetically pleasing (default true).
 * @param {Boolean=} options.showSnow If set to true, renders snow as a separate color from normal precipitation (default false).
 * @param {ColorScheme=} options.colorScheme An integer denoting the color scheme to use in the returned image (default 4).
 * @returns {Image} The rendered radar data overlay.
 */
RainViewer.getOverlay = async function (latitude, longitude, width, height, zoom, timeOffset = TIME_OFFSETS['now'], options={}) {
    latitude = GoogleMaps._toPrecision(latitude);
    longitude = GoogleMaps._toPrecision(longitude);

    width = Math.min(width, 1280); // google maps api invisibly enforces these, so we must match in order to line up properly
    height = Math.min(height, 1280);

    const scale = width <= 640 && height <= 640 ? 1 : 2; // must be 1 or 2 - must match how the GoogleMaps service computes this value
    width = Math.floor(width / scale);
    height = Math.floor(height / scale);

    const DEFAULT_OPTS = {
        smooth: true,
        showSnow: false,
        colorScheme: 4,
    };
    options = _.merge({}, DEFAULT_OPTS, options);

    const bg_width = width * scale;
    const bg_height = height * scale;
    const res = new jimp(bg_width, bg_height);

    const radarIndex = await this._requestData({
        baseUrl: 'https://api.rainviewer.com/public/weather-maps.json',
    });
    const sample = radarIndex.radar[timeOffset[0]][timeOffset[1]];

    const mapInfo = {
        center: { lat: latitude, lon: longitude },
        width, height, zoom, scale,
        mapType: 'roadmap', // just pretend this is a roadmap so the field has a valid value
    };

    const radar_size = 256 * scale;
    const rx = Math.ceil((bg_width - radar_size) / radar_size);
    const ry = Math.ceil((bg_height - radar_size) / radar_size);
    logger.trace(`radar tiling: ${2*rx+1}x${2*ry+1}`);

    const tilesReq = [];
    for (let i = -rx; i <= rx; ++i) {
        for (let j = -ry; j <= ry; ++j) {
            const { lat, lon } = GoogleMaps._coordsAt(radar_size * i, radar_size * j, mapInfo);
            tilesReq.push(this._requestImage({
                baseUrl: radarIndex.host,
                path: `${sample.path}/${radar_size}/${zoom}/${decimalize(lat)}/${decimalize(lon)}/${options.colorScheme}/${(options.smooth ? 1 : 0)}_${(options.showSnow ? 1 : 0)}.png`,
            }));
        }
    }
    const tiles = await Promise.all(tilesReq);

    for (let i = -rx; i <= rx; ++i) {
        for (let j = -ry; j <= ry; ++j) {
            const tile = await jimp.read(tiles[(i + rx) * (2 * ry + 1) + (j + ry)]);
            const px = radar_size * i + Math.round((bg_width - radar_size) / 2);
            const py = -radar_size * j + Math.round((bg_height - radar_size) / 2);
            await res.composite(tile, px, py);
        }
    }

    this._sendImageBuffer(await res.getBufferAsync(jimp.MIME_PNG));
};

module.exports = RainViewer;

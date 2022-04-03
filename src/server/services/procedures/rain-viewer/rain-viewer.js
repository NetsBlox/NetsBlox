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
const SphericalMercator = require('sphericalmercator');
const { GoogleMapsKey } = require('../utils/api-key');
const ApiConsumer = require('../utils/api-consumer');
const CacheManager = require('cache-manager');
const FsStore = require('cache-manager-fs');
const types = require('../../input-types');
const utils = require('../utils');
const jimp = require('jimp');
const _ = require('lodash');
const fs = require('fs');

const CACHE_DIR = process.env.CACHE_DIR || 'cache';
logger.trace(`cache dir (root): ${CACHE_DIR}`);
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR); // ensure path exists
}
const MapCache = CacheManager.caching({
    store: FsStore,
    options: {
        ttl: Infinity,
        maxsize: 1024 * 1000 * 100,
        path: `${CACHE_DIR}/RainViewer`,
        preventfill: false,
        reviveBuffers: true,
    },
});

const RainViewer = new ApiConsumer('RainViewer', '', { cache: { ttl: 5 * 60 } }); // radar data updates every 10 minutes (or so)
ApiConsumer.setRequiredApiKey(RainViewer, GoogleMapsKey);

const MERC = new SphericalMercator({size:256});

const TIME_OFFSET_MAP = {
    '-120min': ['past', 0],
    '-110min': ['past', 1],
    '-100min': ['past', 2],
    '-90min': ['past', 3],
    '-80min': ['past', 4],
    '-70min': ['past', 5],
    '-60min': ['past', 6],
    '-50min': ['past', 7],
    '-40min': ['past', 8],
    '-30min': ['past', 9],
    '-20min': ['past', 10],
    '-10min': ['past', 11],
    'now':    ['past', 12],
    '+10min': ['nowcast', 0],
    '+20min': ['nowcast', 1],
    '+30min': ['nowcast', 2],
};
types.defineType({
    name: 'TimeOffset',
    description: 'A time offset for a weather forecast from the :doc:`/services/RainViewer/index` service.',
    baseType: 'Enum',
    baseParams: TIME_OFFSET_MAP,
});

RainViewer.getTimeOffsets = function () {
    return Object.keys(TIME_OFFSET_MAP);
};

function decimalize(val) {
    const str = val.toString();
    return str.includes('.') ? str : `${str}.0`;
}

function coordsAt(x, y, info) {
    x = Math.ceil(x / info.scale);
    y = Math.ceil(y / info.scale);
    let centerLl = [info.longitude, info.latitude];
    let centerPx = MERC.px(centerLl, info.zoom);
    let targetPx = [centerPx[0] + x, centerPx[1] - y];
    let targetLl = MERC.ll(targetPx, info.zoom); // long lat
    let coords = { lat: targetLl[1], long: targetLl[0] };
    if (coords.long < -180) coords.long += 360;
    if (coords.long > 180) coords.long -= 360;
    return coords;
}

/**
 * Gets an radar image for the specified location.
 * You can use the ``timeOffset`` input to get (recent) past or forecasted radar images.
 *
 * @param {Latitude} latitude Latitude of the returned map (centered).
 * @param {Longitude} longitude Longitude of the returned map (centered).
 * @param {BoundedInteger<1>} width Width (in pixels) of the returned map.
 * @param {BoundedInteger<1>} height Height (in pixels) of the returned map.
 * @param {BoundedInteger<1,25>} zoom The zoom level of the returned image (see the :doc:`/service/GoogleMaps/index` service).
 * @param {TimeOffset=} timeOffset The time offset of the desired forecast (defaults to ``now``, which represents current weather).
 * @param {Object=} options Additional drawing options.
 * @param {Enum<none,roadmap,satellite,terrain>=} options.mapType Type of map to use for the background of the image (radar overlay on top) (default roadmap).
 * @param {Boolean=} options.smooth If set to true, smooths the radar overlay in the returned image to be more aesthetically pleasing (default true).
 * @param {Boolean=} options.showSnow If set to true, renders snow as a separate color from normal precipitation (default false).
 * @param {BoundedInteger<0,21>=} options.colorScheme An integer denoting the color scheme to use in the returned image (default 4).
 * @returns {Image} The rendered radar data.
 */
RainViewer.getMap = async function (latitude, longitude, width, height, zoom, timeOffset = TIME_OFFSET_MAP['now'], options={}) {
    DEFAULT_OPTS = {
        mapType: 'roadmap',
        smooth: true,
        showSnow: false,
        colorScheme: 4,
    };
    options = _.merge({}, DEFAULT_OPTS, options);

    const scale = 2; // must be 1 or 2
    const radar_size = 256 * scale;
    let res = null;
    let bg_width = null;
    let bg_height = null;

    if (options.mapType === 'none') {
        bg_width = width * scale;
        bg_height = height * scale;
        res = new jimp(bg_width, bg_height);
    } else {
        const queryString = utils.encodeQueryData({
            center: `${latitude},${longitude}`,
            size: `${width}x${height}`,
            scale,
            zoom,
            maptype: options.mapType,
            key: this.apiKey.value,
        });
        const map = await MapCache.wrap(JSON.stringify(queryString), () => this._requestImage({
            baseUrl: 'https://maps.googleapis.com/maps/api/staticmap',
            queryString,
            cache: false, // we do our own caching
        }));
        res = await jimp.read(map);
        bg_width = res.bitmap.width;
        bg_height = res.bitmap.height;
    }

    const radarIndex = await this._requestData({
        baseUrl: `https://api.rainviewer.com/public/weather-maps.json`,
    });
    const sample = radarIndex.radar[timeOffset[0]][timeOffset[1]];
    const mapInfo = { latitude, longitude, scale, zoom };

    const rx = Math.ceil((bg_width - radar_size) / radar_size);
    const ry = Math.ceil((bg_height - radar_size) / radar_size);
    logger.trace(`radar tiling: ${2*rx+1}x${2*ry+1}`);

    const tilesReq = [];
    for (let i = -rx; i <= rx; ++i) {
        for (let j = -ry; j <= ry; ++j) {
            const { lat, long } = coordsAt(radar_size * i, radar_size * j, mapInfo);
            tilesReq.push(this._requestImage({
                baseUrl: radarIndex.host,
                path: `${sample.path}/${radar_size}/${zoom}/${decimalize(lat)}/${decimalize(long)}/${options.colorScheme}/${(options.smooth ? 1 : 0)}_${(options.showSnow ? 1 : 0)}.png`,
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

    // for some reason they don't currently support an async version of this
    res.getBuffer(jimp.MIME_PNG, (e, b) => this._sendImageBuffer(b));
    return null; // don't return a result immediately (see callback above)
};

module.exports = RainViewer;

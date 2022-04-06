/**
 * The GoogleMaps Service provides access to the Google Maps API along with helper functions for interacting with the maps (such as converting coordinates).
 * For more information, check out https://developers.google.com/maps/documentation/static-maps/intro
 *
 * Terms of use: https://developers.google.com/maps/terms
 * @service
 */
'use strict';

const logger = require('../utils/logger')('google-maps');
const utils = require('../utils');
const ApiConsumer = require('../utils/api-consumer');
const {GoogleMapsKey} = require('../utils/api-key');
const SphericalMercator = require('sphericalmercator');
const geolib = require('geolib');
const merc = new SphericalMercator({size:256});
const CacheManager = require('cache-manager');
const FsStore = require('cache-manager-fs');
const Storage = require('../../storage');
const jimp = require('jimp');
const _ = require('lodash');
const fs = require('fs');

const { TIME_OFFSET_MAP, defineTypes } = require('./types');
defineTypes();

const PRECISION = 7; // 6 or 5 is probably safe

let storage;

const CACHE_DIR = process.env.CACHE_DIR || 'cache';
logger.trace(`cache dir (root): ${CACHE_DIR}`);
if (!fs.existsSync(CACHE_DIR)) {
    fs.mkdirSync(CACHE_DIR); // ensure path exists
}
const RadarCache = CacheManager.caching({
    store: FsStore,
    options: {
        ttl: 5 * 60, // radar data updates every 10 minutes (or so)
        maxsize: 1024*1000*100,
        path: `${CACHE_DIR}/GoogleMaps-RainViewer`,
        preventfill: false,
        reviveBuffers: true,
    },
});

// Retrieving a static map image
const getStorage = function() {
    if (!storage) {
        const oneHour = 3600;
        storage = Storage.create('google-maps').collection;
        storage.createIndex({ lastReadWrite: 1 }, { expireAfterSeconds: oneHour });
    }
    return storage;
};

const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';

// We will rely on the default maxsize limit of the cache
const GoogleMaps = new ApiConsumer('GoogleMaps', baseUrl, {cache: {ttl: Infinity}});
ApiConsumer.setRequiredApiKey(GoogleMaps, GoogleMapsKey);
GoogleMaps._coordsAt = function(x, y, map) {
    x = Math.ceil(x / map.scale);
    y = Math.ceil(y / map.scale);
    let centerLl = [map.center.lon, map.center.lat];
    let centerPx = merc.px(centerLl, map.zoom);
    let targetPx = [centerPx[0] + parseInt(x), centerPx[1] - parseInt(y)];
    let targetLl = merc.ll(targetPx, map.zoom); // long lat
    let coords = {lat: targetLl[1], lon: targetLl[0]};
    if (coords.lon < -180) coords.lon = coords.lon + 360;
    if (coords.lon > 180) coords.lon = coords.lon - 360;
    return coords;
};

GoogleMaps._pixelsAt = function(lat, lon, map) {
    // current latlon in px
    let curPx = merc.px([map.center.lon, map.center.lat], map.zoom);
    // new latlon in px
    let targetPx = merc.px([lon, lat], map.zoom);
    // difference in px
    let pixelsXY = {x: (targetPx[0] - curPx[0]), y: -(targetPx[1] - curPx[1])};
    // adjust it to map's scale
    pixelsXY = {x: pixelsXY.x * map.scale, y: pixelsXY.y * map.scale};
    return pixelsXY;
};

GoogleMaps._toPrecision = function(number, precisionLimit) {
    return parseFloat(number).toFixed(precisionLimit);
};

GoogleMaps._getGoogleParams = function(options) {
    const params = {
        size: `${options.width}x${options.height}`,
        scale: options.scale,
        center: `${options.center.lat},${options.center.lon}`,
        key: this.apiKey.value,
        zoom: options.zoom || 12,
        maptype: options.mapType
    };

    return utils.encodeQueryData(params, false);
};

GoogleMaps._getClientMap = function(clientId) {
    logger.trace(`getting map for ${clientId}`);

    const query = {$set: {lastReadWrite: new Date()}};
    return getStorage().findOneAndUpdate({clientId}, query)
        .then(result => {
            const doc = result.value;
            if (!doc) {
                throw new Error('No map found. Please request a map and try again.');
            }
            return doc.map;
        });
};

GoogleMaps._recordUserMap = function(caller, map) {
    // Store the user's new map settings
    // get the corners of the image. We need to actully get both they are NOT "just opposite" of eachother.
    const {clientId} = caller;
    let northEastCornerCoords = this._coordsAt(map.width/2*map.scale, map.height/2*map.scale , map);
    let southWestCornerCoords = this._coordsAt(-map.width/2*map.scale, -map.height/2*map.scale , map);

    map.min = {
        lat: southWestCornerCoords.lat,
        lon: southWestCornerCoords.lon
    };
    map.max = {
        lat: northEastCornerCoords.lat,
        lon: northEastCornerCoords.lon
    };

    const query = {
        $set: {
            lastReadWrite: new Date(),
            clientId,
            map,
        }
    };
    return getStorage().updateOne({clientId}, query, {upsert: true})
        .then(() => logger.trace(`Stored map for ${caller.clientId}: ${JSON.stringify(map)}`));
};

GoogleMaps._getMap = async function(latitude, longitude, width, height, zoom, mapType) {
    const scale = width <= 640 && height <= 640 ? 1 : 2;
    const options = {
        center: {
            lat: GoogleMaps._toPrecision(latitude, PRECISION),
            lon: GoogleMaps._toPrecision(longitude, PRECISION)
        },
        width: (width / scale),
        height: (height / scale),
        zoom: zoom,
        scale,
        mapType: mapType || 'roadmap'
    };
    const queryString = this._getGoogleParams(options);
    const cacheKey = JSON.stringify(options);

    await this._recordUserMap(this.caller, options);
    return this._sendImage({queryString, cacheKey});
};

/**
 * Get a map image of the given region.
 *
 * @category Maps
 * @param {Latitude} latitude Latitude of center point
 * @param {Longitude} longitude Longitude of center point
 * @param {BoundedInteger<1>} width Image width
 * @param {BoundedInteger<1>} height Image height
 * @param {BoundedInteger<1,25>} zoom Zoom level of map image
 * @returns {Image} Map image
 */
GoogleMaps.getMap = function(latitude, longitude, width, height, zoom){

    return this._getMap(latitude, longitude, width, height, zoom, 'roadmap');
};

/**
 * Get a satellite map image of the given region.
 *
 * @category Maps
 * @param {Latitude} latitude Latitude of center point
 * @param {Longitude} longitude Longitude of center point
 * @param {BoundedInteger<1>} width Image width
 * @param {BoundedInteger<1>} height Image height
 * @param {BoundedInteger<1,25>} zoom Zoom level of map image
 * @returns {Image} Map image
 */
GoogleMaps.getSatelliteMap = function(latitude, longitude, width, height, zoom){

    return this._getMap(latitude, longitude, width, height, zoom, 'satellite');
};

/**
 * Get a terrain map image of the given region.
 *
 * @category Maps
 * @param {Latitude} latitude Latitude of center point
 * @param {Longitude} longitude Longitude of center point
 * @param {BoundedInteger<1>} width Image width
 * @param {BoundedInteger<1>} height Image height
 * @param {BoundedInteger<1,25>} zoom Zoom level of map image
 * @returns {Image} Map image
 */
GoogleMaps.getTerrainMap = function(latitude, longitude, width, height, zoom){

    return this._getMap(latitude, longitude, width, height, zoom, 'terrain');
};

/**
 * Convert longitude to the x value on the map image.
 *
 * @category Utility
 * @param {Longitude} longitude Longitude coordinate
 * @returns {Number} Map x coordinate of the given longitude
 */
GoogleMaps.getXFromLongitude = async function(longitude) {
    const mapInfo = await this._getClientMap(this.caller.clientId);
    let pixels = this._pixelsAt(0, longitude, mapInfo);
    return pixels.x;
};

/**
 * Convert latitude to the y value on the map image.
 *
 * @category Utility
 * @param {Latitude} latitude Latitude coordinate
 * @returns {Number} Map y coordinate of the given latitude
 */
GoogleMaps.getYFromLatitude = async function(latitude) {
    const mapInfo = await this._getClientMap(this.caller.clientId);
    let pixels = this._pixelsAt(latitude, 0, mapInfo);
    return pixels.y;
};

/**
 * Convert x value of map image to longitude.
 *
 * @category Utility
 * @param {Number} x x value of map image
 * @returns {Longitude} Longitude of the x value from the image
 */
GoogleMaps.getLongitudeFromX = async function(x){
    const mapInfo = await this._getClientMap(this.caller.clientId);
    let coords = this._coordsAt(x, 0, mapInfo);
    return coords.lon;
};

/**
 * Convert y value of map image to latitude.
 *
 * @category Utility
 * @param {Number} y y value of map image
 * @returns {Latitude} Latitude of the ``y`` value from the image
 */
GoogleMaps.getLatitudeFromY = async function(y){
    const mapInfo = await this._getClientMap(this.caller.clientId);
    let coords = this._coordsAt(0, y, mapInfo);
    return coords.lat;
};

/**
 * Convert x value of map image to longitude.
 *
 * @category Utility
 * @param {Number} x x value of map image
 * @returns {Longitude} Longitude of the ``x`` value from the image
 *
 * @deprecated
 */
GoogleMaps.getLongitude = function(x){
    return this.getLongitudeFromX(x);
};

/**
 * Convert y value of map image to latitude.
 *
 * @category Utility
 * @param {Number} y y value of map image
 * @returns {Latitude} Latitude of the y value from the image
 *
 * @deprecated
 */
GoogleMaps.getLatitude = function(y){
    return this.getLatitudeFromY(y);
};

/**
 * Get the earth coordinates ``[latitude, longitude]`` of a given point in the last requested map image ``[x, y]``.
 *
 * @category Utility
 * @param {Number} x x position of the point
 * @param {Number} y y position of the point
 * @returns {Array} A list containing the latitude and longitude of the given point.
 */

GoogleMaps.getEarthCoordinates = function(x, y){
    return this._getClientMap(this.caller.clientId).then(mapInfo => {
        let coords = this._coordsAt(x,y, mapInfo);
        return [coords.lat, coords.lon];
    });
};

/**
 * Get the image coordinates ``[x, y]`` of a given location on the earth ``[latitude, longitude]``.
 *
 * @category Utility
 * @param {Latitude} latitude latitude of the point
 * @param {Longitude} longitude longitude of the point
 * @returns {Array} A list containing the ``[x, y]`` position of the given point.
 */

GoogleMaps.getImageCoordinates = function(latitude, longitude){
    return this._getClientMap(this.caller.clientId).then(mapInfo => {
        let pixels = this._pixelsAt(latitude, longitude, mapInfo);
        return [pixels.x, pixels.y];
    });
};

/**
 * Get the straight line distance between two points in meters.
 *
 * @category Utility
 * @param {Latitude} startLatitude Latitude of start point
 * @param {Longitude} startLongitude Longitude of start point
 * @param {Latitude} endLatitude Latitude of end point
 * @param {Longitude} endLongitude Longitude of end point
 * @returns {Number} Distance in meters
 */
GoogleMaps.getDistance = function(startLatitude, startLongitude, endLatitude, endLongitude){
    return geolib.getDistance(
        {latitude: startLatitude, longitude: startLongitude},
        {latitude: endLatitude, longitude: endLongitude}
    );
};

/**
 * Get the maximum longitude of the current map.
 *
 * @category Utility
 * @returns {Longitude}
 */
GoogleMaps.maxLongitude = function() {
    return this._getClientMap(this.caller.clientId)
        .then(map => map.max.lon);
};

/**
 * Get the maximum latitude of the current map.
 *
 * @category Utility
 * @returns {Longitude}
 */
GoogleMaps.maxLatitude = function() {
    return this._getClientMap(this.caller.clientId)
        .then(map => map.max.lat);
};

/**
 * Get the minimum longitude of the current map.
 *
 * @category Utility
 * @returns {Longitude}
 */
GoogleMaps.minLongitude = async function() {
    const map = await this._getClientMap(this.caller.clientId);
    return map.min.lon;
};

/**
 * Get the minimum latitude of the current map.
 *
 * @category Utility
 * @returns {Longitude}
 */
GoogleMaps.minLatitude = async function() {
    const map = await this._getClientMap(this.caller.clientId);
    return map.min.lat;
};

/**
 * Get the list of valid radar time offsets for the :func:`GoogleMaps.getRadarMap` RPC.
 * The returned time offsets are in chronological order.
 *
 * @category Radar
 * @returns {Array<TimeOffset>} The list of valid time offsets in chronological order.
 */
GoogleMaps.getRadarTimeOffsets = function () {
    return Object.keys(TIME_OFFSET_MAP);
};

function decimalize(val) {
    const str = val.toString();
    return str.includes('.') ? str : `${str}.0`;
}

GoogleMaps._radarCacheReq = async function (reqFn, baseUrl, path, query) {
    baseUrl = baseUrl || '';
    path = path || '';
    query = query || {};

    const key = JSON.stringify({ baseUrl, path, query });
    return await RadarCache.wrap(key, () => reqFn.call(this, {
        baseUrl,
        path,
        queryString: utils.encodeQueryData(query),
        cache: false, // we do our own caching
    }));
};

/**
 * Equivalent to :func:`GoogleMaps.getMap` except that it includes a configurable weather radar overlay.
 * You can use the ``timeOffset`` input to get (recent) past or forecasted radar images.
 *
 * @category Radar
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
GoogleMaps.getRadarMap = async function (latitude, longitude, width, height, zoom, timeOffset = TIME_OFFSET_MAP['now'], options={}) {
    latitude = GoogleMaps._toPrecision(latitude, PRECISION);
    longitude = GoogleMaps._toPrecision(longitude, PRECISION);

    const scale = width <= 640 && height <= 640 ? 1 : 2; // must be 1 or 2
    width = Math.floor(width / scale);
    height = Math.floor(height / scale);

    const DEFAULT_OPTS = {
        mapType: 'roadmap',
        smooth: true,
        showSnow: false,
        colorScheme: 4,
    };
    options = _.merge({}, DEFAULT_OPTS, options);

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
        const map = await this._requestImage({
            baseUrl: 'https://maps.googleapis.com/maps/api/staticmap',
            queryString,
            cache: false, // we do our own caching
        });
        res = await jimp.read(map);
        bg_width = res.bitmap.width;
        bg_height = res.bitmap.height;
    }

    const radarIndex = await this._radarCacheReq(this._requestData, 'https://api.rainviewer.com/public/weather-maps.json');
    const sample = radarIndex.radar[timeOffset[0]][timeOffset[1]];

    const mapInfo = {
        center: { lat: latitude, lon: longitude },
        width, height, zoom, scale,
        mapType: options.mapType,
    };
    if (options.mapType !== 'none') await this._recordUserMap(this.caller, mapInfo);

    const radar_size = 256 * scale;
    const rx = Math.ceil((bg_width - radar_size) / radar_size);
    const ry = Math.ceil((bg_height - radar_size) / radar_size);
    logger.trace(`radar tiling: ${2*rx+1}x${2*ry+1}`);

    const tilesReq = [];
    for (let i = -rx; i <= rx; ++i) {
        for (let j = -ry; j <= ry; ++j) {
            const { lat, lon } = this._coordsAt(radar_size * i, radar_size * j, mapInfo);
            tilesReq.push(this._radarCacheReq(this._requestImage, radarIndex.host, `${sample.path}/${radar_size}/${zoom}/${decimalize(lat)}/${decimalize(lon)}/${options.colorScheme}/${(options.smooth ? 1 : 0)}_${(options.showSnow ? 1 : 0)}.png`));
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

// Map of argument name to old field name
GoogleMaps.COMPATIBILITY = {
    path: 'staticmap',
    arguments: {
        getMap: {
            latitude: 'lat',
            longitude: 'lon'
        },
        getXFromLongitude: {
            longitude: 'lng'
        },
        getYFromLatitude: {
            latitude: 'lat'
        }
    }
};

module.exports = GoogleMaps;

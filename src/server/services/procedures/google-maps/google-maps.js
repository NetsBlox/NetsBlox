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
const Storage = require('../../storage');
const PRECISION = 7; // 6 or 5 is probably safe

var storage;

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

GoogleMaps._getGoogleParams = function(options, precisionLimit=PRECISION) {
    const centerLat = parseFloat(options.center.lat).toFixed(precisionLimit);
    const centerLon = parseFloat(options.center.lon).toFixed(precisionLimit);
    const params = {
        size: `${options.width}x${options.height}`,
        scale: options.scale,
        center: `${centerLat},${centerLon}`,
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
            lat: latitude,
            lon: longitude,
        },
        width: (width / scale),
        height: (height / scale),
        zoom: zoom,
        scale,
        mapType: mapType || 'roadmap'
    };
    const queryString = this._getGoogleParams(options, PRECISION);

    await this._recordUserMap(this.caller, options);
    return this._sendImage({queryString});
};

/**
 * Get a map image of the given region.
 * @param {Latitude} latitude Latitude of center point
 * @param {Longitude} longitude Longitude of center point
 * @param {BoundedNumber<1>} width Image width
 * @param {BoundedNumber<1>} height Image height
 * @param {BoundedNumber<0,25>} zoom Zoom level of map image
 * @returns {Image} Map image
 */
GoogleMaps.getMap = function(latitude, longitude, width, height, zoom){

    return this._getMap(latitude, longitude, width, height, zoom, 'roadmap');
};

/**
 * Get a satellite map image of the given region.
 * @param {Latitude} latitude Latitude of center point
 * @param {Longitude} longitude Longitude of center point
 * @param {BoundedNumber<1>} width Image width
 * @param {BoundedNumber<1>} height Image height
 * @param {BoundedNumber<0,25>} zoom Zoom level of map image
 * @returns {Image} Map image
 */
GoogleMaps.getSatelliteMap = function(latitude, longitude, width, height, zoom){

    return this._getMap(latitude, longitude, width, height, zoom, 'satellite');
};

/**
 * Get a terrain map image of the given region.
 * @param {Latitude} latitude Latitude of center point
 * @param {Longitude} longitude Longitude of center point
 * @param {BoundedNumber<1>} width Image width
 * @param {BoundedNumber<1>} height Image height
 * @param {BoundedNumber<0,25>} zoom Zoom level of map image
 * @returns {Image} Map image
 */
GoogleMaps.getTerrainMap = function(latitude, longitude, width, height, zoom){

    return this._getMap(latitude, longitude, width, height, zoom, 'terrain');
};

/**
 * Convert longitude to the x value on the map image.
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
 * @param {Number} y y value of map image
 * @returns {Latitude} Latitude of the y value from the image
 */
GoogleMaps.getLatitudeFromY = async function(y){
    const mapInfo = await this._getClientMap(this.caller.clientId);
    let coords = this._coordsAt(0, y, mapInfo);
    return coords.lat;
};

/**
 * Convert x value of map image to longitude.
 * @param {Number} x x value of map image
 * @returns {Longitude} Longitude of the x value from the image
 *
 * @deprecated
 */
GoogleMaps.getLongitude = function(x){
    return this.getLongitudeFromX(x);
};

/**
 * Convert y value of map image to latitude.
 * @param {Number} y y value of map image
 * @returns {Latitude} Latitude of the y value from the image
 *
 * @deprecated
 */
GoogleMaps.getLatitude = function(y){
    return this.getLatitudeFromY(y);
};

/**
 * Get the earth coordinates (latitude, longitude) of a given point in the last requested map image (x, y).
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
 * Get the image coordinates (x, y) of a given location on the earth (latitude, longitude).
 * @param {Latitude} latitude latitude of the point
 * @param {Longitude} longitude longitude of the point
 * @returns {Array} A list containing (x, y) position of the given point.
 */

GoogleMaps.getImageCoordinates = function(latitude, longitude){
    return this._getClientMap(this.caller.clientId).then(mapInfo => {
        let pixels = this._pixelsAt(latitude, longitude, mapInfo);
        return [pixels.x, pixels.y];
    });
};

/**
 * Get the straight line distance between two points in meters.
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
 * @returns {Longitude}
 */
GoogleMaps.maxLongitude = function() {
    return this._getClientMap(this.caller.clientId)
        .then(map => map.max.lon);
};

/**
 * Get the maximum latitude of the current map.
 * @returns {Longitude}
 */
GoogleMaps.maxLatitude = function() {
    return this._getClientMap(this.caller.clientId)
        .then(map => map.max.lat);
};

/**
 * Get the minimum longitude of the current map.
 * @returns {Longitude}
 */
GoogleMaps.minLongitude = async function() {
    const map = await this._getClientMap(this.caller.clientId);
    return map.min.lon;
};

/**
 * Get the minimum latitude of the current map.
 * @returns {Longitude}
 */
GoogleMaps.minLatitude = async function() {
    const map = await this._getClientMap(this.caller.clientId);
    return map.min.lat;
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

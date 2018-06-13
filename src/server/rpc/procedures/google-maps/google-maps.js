/**
 * The GoogleMaps Service provides access to the Google Maps API along with helper functions for interacting with the maps (such as converting coordinates).
 * For more information, check out https://developers.google.com/maps/documentation/static-maps/intro
 *
 * Terms of use: https://developers.google.com/maps/terms
 * @service
 */
'use strict';

const logger = require('../utils/logger')('google-maps');
const request = require('request');
const SphericalMercator = require('sphericalmercator');
const geolib = require('geolib');
const merc = new SphericalMercator({size:256});
const CacheManager = require('cache-manager');
const Storage = require('../../storage');

// TODO: Change this cache to mongo or something (file?)
// This cache is shared among all GoogleMaps instances
const cache = CacheManager.caching({store: 'memory', max: 1000, ttl: Infinity});
const key = process.env.GOOGLE_MAPS_KEY;

var storage;

// Retrieving a static map image
var baseUrl = 'https://maps.googleapis.com/maps/api/staticmap',
    getStorage = function() {
        if (!storage) {
            storage = Storage.create('static-map');
        }
        return storage;
    };

var GoogleMaps = function(roomId) {
    this._state = {};
    this._state.roomId = roomId;
    this._state.userMaps = {};  // Store the state of the map for each user
};

GoogleMaps.prototype._coordsAt = function(x, y, map) {
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

GoogleMaps.prototype._pixelsAt = function(lat, lon, map) {
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


// precisionLimit if present would limit the precision of coordinate parameters
GoogleMaps.prototype._getGoogleParams = function(options, precisionLimit) {
    // Create the params for Google
    var params = [];
    params.push('size=' + options.width + 'x' + options.height);
    params.push('scale=' + options.scale);
    // reduce lat lon precisionLimit to a reasonable value to reduce cache misses
    let centerLat = precisionLimit ? parseFloat(options.center.lat).toFixed(precisionLimit) : options.center.lat;
    let centerLon = precisionLimit ? parseFloat(options.center.lon).toFixed(precisionLimit) : options.center.lon;
    params.push('center=' + centerLat + ',' + centerLon);
    params.push('key=' + key);
    params.push('zoom='+(options.zoom || '12'));
    params.push('maptype='+(options.mapType));
    return params.join('&');
};

GoogleMaps.prototype._getMapInfo = function(roleId) {
    return getStorage().get(this._state.roomId)
        .then(maps => {
            logger.trace(`getting map for ${roleId}: ${JSON.stringify(maps)}`);
            return maps[roleId];
        });
};

GoogleMaps.prototype._recordUserMap = function(socket, map) {
    // Store the user's new map settings
    // get the corners of the image. We need to actully get both they are NOT "just opposite" of eachother.
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
    return getStorage().get(this._state.roomId)
        .then(maps => {
            maps = maps || {};
            maps[socket.role] = map;
            getStorage().save(this._state.roomId, maps);
        })
        .then(() => logger.trace(`Stored map for ${socket.role}: ${JSON.stringify(map)}`));
};



GoogleMaps.prototype._getMap = function(latitude, longitude, width, height, zoom, mapType) {
    let scale = width <= 640 && height <= 640 ? 1 : 2;
    var response = this.response,
        options = {
            center: {
                lat: latitude,
                lon: longitude,
            },
            width: (width / scale),
            height: (height / scale),
            zoom: zoom,
            scale,
            mapType: mapType || 'roadmap'
        },
        params = this._getGoogleParams(options),
        url = baseUrl+'?'+params;

    // Check the cache
    this._recordUserMap(this.socket, options).then(() => {

        // allow the lookups that are "close" to an already visited location hit the cache
        const PRECISION = 7; // 6 or 5 is probably safe
        const cacheKey = this._getGoogleParams(options, PRECISION);
        cache.wrap(cacheKey, cacheCallback => {
            // Get the image -> not in cache!
            logger.trace('request params:', options);
            logger.trace('url is '+url);
            logger.trace('Requesting new image from google!');
            var mapResponse = request.get(url);
            delete mapResponse.headers['cache-control'];

            // Gather the data...
            var result = new Buffer(0);
            mapResponse.on('data', function(data) {
                result = Buffer.concat([result, data]);
            });
            mapResponse.on('end', function() {
                return cacheCallback(null, result);
            });
        }, (err, imageBuffer) => {
            // Send the response to the user
            logger.trace('Sending the response!');
            // Set the headers
            response.set('cache-control', 'private, no-store, max-age=0');
            response.set('content-type', 'image/png');
            response.set('content-length', imageBuffer.length);
            response.set('connection', 'close');

            response.status(200).send(imageBuffer);
            logger.trace('Sent the response!');
        });

    });
};

/**
 * Get a map image of the given region.
 * @param {Latitude} latitude Latitude of center point
 * @param {Longitude} longitude Longitude of center point
 * @param {BoundedNumber<0>} width Image width
 * @param {BoundedNumber<0>} height Image height
 * @param {BoundedNumber<0,25>} zoom Zoom level of map image
 * @returns {Image} Map image
 */
GoogleMaps.prototype.getMap = function(latitude, longitude, width, height, zoom){

    this._getMap(latitude, longitude, width, height, zoom, 'roadmap');

    return null;
};

/**
 * Get a satellite map image of the given region.
 * @param {Latitude} latitude Latitude of center point
 * @param {Longitude} longitude Longitude of center point
 * @param {BoundedNumber<0>} width Image width
 * @param {BoundedNumber<0>} height Image height
 * @param {BoundedNumber<0,25>} zoom Zoom level of map image
 * @returns {Image} Map image
 */
GoogleMaps.prototype.getSatelliteMap = function(latitude, longitude, width, height, zoom){

    this._getMap(latitude, longitude, width, height, zoom, 'satellite');

    return null;
};

/**
 * Get a terrain map image of the given region.
 * @param {Latitude} latitude Latitude of center point
 * @param {Longitude} longitude Longitude of center point
 * @param {BoundedNumber<0>} width Image width
 * @param {BoundedNumber<0>} height Image height
 * @param {BoundedNumber<0,25>} zoom Zoom level of map image
 * @returns {Image} Map image
 */
GoogleMaps.prototype.getTerrainMap = function(latitude, longitude, width, height, zoom){

    this._getMap(latitude, longitude, width, height, zoom, 'terrain');

    return null;
};

/**
 * Convert longitude to the x value on the map image.
 * @param {Longitude} longitude Longitude coordinate
 * @returns {Number} Map x coordinate of the given longitude
 */
GoogleMaps.prototype.getXFromLongitude = function(longitude) {
    return this._getMapInfo(this.socket.role).then(mapInfo => {
        let pixels = this._pixelsAt(0,longitude, mapInfo);
        return pixels.x;
    });
};

/**
 * Convert latitude to the y value on the map image.
 * @param {Latitude} latitude Latitude coordinate
 * @returns {Number} Map y coordinate of the given latitude
 */
GoogleMaps.prototype.getYFromLatitude = function(latitude) {
    return this._getMapInfo(this.socket.role).then(mapInfo => {
        let pixels = this._pixelsAt(latitude,0, mapInfo);
        return pixels.y;
    });
};

/**
 * Convert x value of map image to longitude.
 * @param {Number} x x value of map image
 * @returns {Longitude} Longitude of the x value from the image
 */
GoogleMaps.prototype.getLongitudeFromX = function(x){
    return this._getMapInfo(this.socket.role).then(mapInfo => {
        let coords = this._coordsAt(x,0, mapInfo);
        return coords.lon;
    });
};

/**
 * Convert y value of map image to latitude.
 * @param {Number} y y value of map image
 * @returns {Latitude} Latitude of the y value from the image
 */
GoogleMaps.prototype.getLatitudeFromY = function(y){
    return this._getMapInfo(this.socket.role).then(mapInfo => {
        let coords = this._coordsAt(0,y, mapInfo);
        return coords.lat;
    });
};

/**
 * Convert x value of map image to longitude.
 * @param {Number} x x value of map image
 * @returns {Longitude} Longitude of the x value from the image
 *
 * @deprecated
 */
GoogleMaps.prototype.getLongitude = function(x){
    return this.getLongitudeFromX(x);
};

/**
 * Convert y value of map image to latitude.
 * @param {Number} y y value of map image
 * @returns {Latitude} Latitude of the y value from the image
 *
 * @deprecated
 */
GoogleMaps.prototype.getLatitude = function(y){
    return this.getLatitudeFromY(y);
};

/**
 * Get the earth coordinates (latitude, longitude) of a given point in the last requested map image (x, y).
 * @param {Number} x x position of the point
 * @param {Number} y y position of the point
 * @returns {Array} A list containing the latitude and longitude of the given point.
 */

GoogleMaps.prototype.getEarthCoordinates = function(x, y){
    return this._getMapInfo(this.socket.role).then(mapInfo => {
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

GoogleMaps.prototype.getImageCoordinates = function(latitude, longitude){
    return this._getMapInfo(this.socket.role).then(mapInfo => {
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
GoogleMaps.prototype.getDistance = function(startLatitude, startLongitude, endLatitude, endLongitude){
    return geolib.getDistance(
        {latitude: startLatitude, longitude: startLongitude},
        {latitude: endLatitude, longitude: endLongitude}
    );
};

// Getting current map settings
GoogleMaps.prototype._getUserMap = function() {
    var response = this.response;

    return this._getMapInfo(this.socket.role).then(map => {
        if (!map) {
            response.send('ERROR: No map found. Please request a map and try again.');
            return null;
        }
        return map;
    });
};

var mapGetter = function(minMax, attr) {
    return function() {
        var response = this.response;

        this._getMapInfo(this.socket.role).then(map => {

            if (!map) {
                response.send('ERROR: No map found. Please request a map and try again.');
            } else {
                response.json(map[minMax][attr]);
            }

        });

        return null;
    };
};

/**
 * Get the maximum longitude of the current map.
 * @returns {Longitude}
 */
GoogleMaps.prototype.maxLongitude = mapGetter('max', 'lon');

/**
 * Get the maximum latitude of the current map.
 * @returns {Longitude}
 */
GoogleMaps.prototype.maxLatitude = mapGetter('max', 'lat');

/**
 * Get the minimum longitude of the current map.
 * @returns {Longitude}
 */
GoogleMaps.prototype.minLongitude = mapGetter('min', 'lon');

/**
 * Get the minimum latitude of the current map.
 * @returns {Longitude}
 */
GoogleMaps.prototype.minLatitude = mapGetter('min', 'lat');

GoogleMaps.isSupported = () => {
    if(!key){
        /* eslint-disable no-console*/
        console.error('GOOGLE_MAPS_KEY is missing.');
        /* eslint-enable no-console*/
    }
    return !!key;
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

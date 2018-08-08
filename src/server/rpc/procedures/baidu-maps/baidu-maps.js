/**
 * The BaiduMaps Service provides access to the Baidu Maps API to provide an alternative to Google Maps for Chinese users.
 * For more information, check out http://lbsyun.baidu.com/index.php?title=static
 *
 * Terms of use: http://lbsyun.baidu.com/index.php?title=open/question
 * @service
 */
'use strict';

const logger = require('../utils/logger')('baidu-maps');
const request = require('request');
const SphericalMercator = require('sphericalmercator');
const geolib = require('geolib');
const merc = new SphericalMercator({size:256});
const CacheManager = require('cache-manager');
const Storage = require('../../storage');

// TODO: Change this cache to mongo or something (file?)
// This cache is shared among all BaiduMaps instances
const cache = CacheManager.caching({store: 'memory', max: 1000, ttl: Infinity});
const key = process.env.BAIDU_MAPS_KEY;

var storage;

// Retrieving a static map image
var baseUrl = 'https://api.map.baidu.com/staticimage/v2?mcode=666666&',
    getStorage = function() {
        if (!storage) {
            storage = Storage.create('baidu-maps');
        }
        return storage;
    };

var BaiduMaps = function(projectId) {
    this._state = {};
    this._state.projectId = projectId;
    this._state.userMaps = {};  // Store the state of the map for each user
    this.coordscale = 1.16447486;
};

BaiduMaps.prototype._coordsAt = function(x, y, map) {
    let centerLl = [map.center.lon, map.center.lat];
    let centerPx = merc.px(centerLl, map.zoom - 1);
    let targetPx = [centerPx[0] + parseInt(x), centerPx[1] - parseInt(y)];
    let targetLl = merc.ll(targetPx, map.zoom - 1); // long lat
    let coords = {lat: targetLl[1], lon: targetLl[0]};
    if (coords.lon < -180) coords.lon = coords.lon + 360;
    if (coords.lon > 180) coords.lon = coords.lon - 360;
    return coords;
};

BaiduMaps.prototype._pixelsAt = function(lat, lon, map) {
    // current latlon in px
    let curPx = merc.px([map.center.lon, map.center.lat], map.zoom - 1);
    // new latlon in px
    let targetPx = merc.px([lon, lat], map.zoom - 1);
    // difference in px
    return {x: (targetPx[0] - curPx[0]), y: -(targetPx[1] - curPx[1])};
};


// precisionLimit if present would limit the precision of coordinate parameters
BaiduMaps.prototype._getBaiduParams = function(options, precisionLimit) {
    // Create the params for Baidu
    var params = [];
    params.push('width=' + options.width);
    params.push('height=' + options.height);
    // reduce lat lon precisionLimit to a reasonable value to reduce cache misses
    let centerLat = precisionLimit ? parseFloat(options.center.lat).toFixed(precisionLimit) : options.center.lat;
    let centerLon = precisionLimit ? parseFloat(options.center.lon).toFixed(precisionLimit) : options.center.lon;
    params.push('center=' + centerLon + ',' + centerLat);
    params.push('ak=' + key);
    params.push('zoom='+(options.zoom || '12'));
    
    return params.join('&');
};

BaiduMaps.prototype._getMapInfo = function(clientId) {
    return getStorage().get(this._state.projectId)
        .then(maps => {
            logger.trace(`getting map for ${clientId}: ${JSON.stringify(maps)}`);

            return maps && maps[clientId];
        });
};

BaiduMaps.prototype._recordUserMap = function(caller, map) {
    // Store the user's new map settings
    // get the corners of the image. We need to actully get both they are NOT "just opposite" of eachother.
    let northEastCornerCoords = this._coordsAt(map.width/2, map.height/2 , map);
    let southWestCornerCoords = this._coordsAt(-map.width/2, -map.height/2 , map);

    map.min = {
        lat: southWestCornerCoords.lat,
        lon: southWestCornerCoords.lon
    };
    map.max = {
        lat: northEastCornerCoords.lat,
        lon: northEastCornerCoords.lon
    };
    return getStorage().get(this._state.projectId)
        .then(maps => {
            maps = maps || {};
            maps[caller.clientId] = map;
            getStorage().save(this._state.projectId, maps);
        })
        .then(() => logger.trace(`Stored map for ${caller.clientId}: ${JSON.stringify(map)}`));
};



BaiduMaps.prototype._getMap = function(latitude, longitude, width, height, zoom) {
    var response = this.response,
        options = {
            center: {
                lat: latitude,
                lon: longitude,
            },
            width: width,
            height: height,
            zoom: zoom,
        },
        params = this._getBaiduParams(options),
        url = baseUrl+params;
    
    // Check the cache
    this._recordUserMap(this.caller, options).then(() => {

        // allow the lookups that are "close" to an already visited location hit the cache
        const PRECISION = 7; // 6 or 5 is probably safe
        const cacheKey = this._getBaiduParams(options, PRECISION);
        cache.wrap(cacheKey, cacheCallback => {
            // Get the image -> not in cache!
            logger.trace('request params:', options);
            logger.trace('url is '+url);
            logger.trace('Requesting new image from server!');
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
 * @param {BoundedNumber<1,1024>} width Image width
 * @param {BoundedNumber<1,1024>} height Image height
 * @param {BoundedNumber<1,19>} zoom Zoom level of map image
 * @returns {Image} Map image
 */
BaiduMaps.prototype.getMap = function(latitude, longitude, width, height, zoom){

    this._getMap(latitude, longitude, width, height, zoom);

    return null;
};

/**
 * Convert longitude to the x value on the map image.
 * @param {Longitude} longitude Longitude coordinate
 * @returns {Number} Map x coordinate of the given longitude
 */
BaiduMaps.prototype.getXFromLongitude = function(longitude) {
    return this._getUserMap(this.caller.clientId).then(mapInfo => {
        let pixels = this._pixelsAt(0,longitude, mapInfo);
        return pixels.x;
    });
};

/**
 * Convert latitude to the y value on the map image.
 * @param {Latitude} latitude Latitude coordinate
 * @returns {Number} Map y coordinate of the given latitude
 */
BaiduMaps.prototype.getYFromLatitude = function(latitude) {
    return this._getUserMap(this.caller.clientId).then(mapInfo => {
        let pixels = this._pixelsAt(latitude,0, mapInfo);
        return pixels.y;
    });
};

/**
 * Convert x value of map image to longitude.
 * @param {Number} x x value of map image
 * @returns {Longitude} Longitude of the x value from the image
 */
BaiduMaps.prototype.getLongitudeFromX = function(x){
    return this._getUserMap(this.caller.clientId).then(mapInfo => {
        let coords = this._coordsAt(x / this.coordscale,0, mapInfo);
        return coords.lon;
    });
};

/**
 * Convert y value of map image to latitude.
 * @param {Number} y y value of map image
 * @returns {Latitude} Latitude of the y value from the image
 */
BaiduMaps.prototype.getLatitudeFromY = function(y){
    return this._getUserMap(this.caller.clientId).then(mapInfo => {
        let coords = this._coordsAt(0,y / this.coordscale, mapInfo);
        return coords.lat;
    });
};

/**
 * Get the earth coordinates (latitude, longitude) of a given point in the last requested map image (x, y).
 * @param {Number} x x position of the point
 * @param {Number} y y position of the point
 * @returns {Array} A list containing the latitude and longitude of the given point.
 */
BaiduMaps.prototype.getEarthCoordinates = function(x, y){
    return this._getUserMap(this.caller.clientId).then(mapInfo => {
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
BaiduMaps.prototype.getImageCoordinates = function(latitude, longitude){
    return this._getUserMap(this.caller.clientId).then(mapInfo => {
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
BaiduMaps.prototype.getDistance = function(startLatitude, startLongitude, endLatitude, endLongitude){
    return geolib.getDistance(
        {latitude: startLatitude, longitude: startLongitude},
        {latitude: endLatitude, longitude: endLongitude}
    );
};

// Getting current map settings
BaiduMaps.prototype._getUserMap = function() {
    return this._getMapInfo(this.caller.clientId).then(map => {
        if (!map) {
            throw new Error('No map found. Please request a map and try again.');
        }
        return map;
    });
};

var mapGetter = function(minMax, attr) {
    return function() {
        return this._getUserMap(this.caller.clientId)
            .then(map => map[minMax][attr]);
    };
};

/**
 * Get the maximum longitude of the current map.
 * @returns {Longitude}
 */
BaiduMaps.prototype.maxLongitude = mapGetter('max', 'lon');

/**
 * Get the maximum latitude of the current map.
 * @returns {Longitude}
 */
BaiduMaps.prototype.maxLatitude = mapGetter('max', 'lat');

/**
 * Get the minimum longitude of the current map.
 * @returns {Longitude}
 */
BaiduMaps.prototype.minLongitude = mapGetter('min', 'lon');

/**
 * Get the minimum latitude of the current map.
 * @returns {Longitude}
 */
BaiduMaps.prototype.minLatitude = mapGetter('min', 'lat');

BaiduMaps.isSupported = () => {
    if(!key){
        /* eslint-disable no-console*/
        console.error('BAIDU_MAPS_KEY is missing.');
        /* eslint-enable no-console*/
    }
    return !!key;
};

module.exports = BaiduMaps;

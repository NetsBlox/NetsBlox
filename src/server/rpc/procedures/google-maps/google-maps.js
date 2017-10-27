// This is an RPC to provide access to Google maps and map utilities
//
// For end-user convenience, it is stateful and remembers the map lat,lng and
// size of the image for each user in the given group
'use strict';

var debug = require('debug'),
    trace = debug('netsblox:rpc:static-map:trace'),
    request = require('request'),
    SphericalMercator = require('sphericalmercator'),
    geolib = require('geolib'),
    merc = new SphericalMercator({size:256}),
    CacheManager = require('cache-manager'),
    Storage = require('../../storage'),
    // TODO: Change this cache to mongo or something (file?)
    // This cache is shared among all StaticMap instances
    cache = CacheManager.caching({store: 'memory', max: 1000, ttl: Infinity}),
    key = process.env.GOOGLE_MAPS_KEY;

// TODO: check that the env variable is defined
var storage;

// Retrieving a static map image
var baseUrl = 'https://maps.googleapis.com/maps/api/staticmap',
    getStorage = function() {
        if (!storage) {
            storage = Storage.create('static-map');
        }
        return storage;
    };

var StaticMap = function(roomId) {
    this._state = {};
    this._state.roomId = roomId;
    this._state.userMaps = {};  // Store the state of the map for each user
};

StaticMap.prototype._coordsAt = function(x, y, map) {
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

StaticMap.prototype._pixelsAt = function(lat, lon, map) {
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


StaticMap.prototype._getGoogleParams = function(options) {
    // Create the params for Google
    var params = [];
    params.push('size=' + options.width + 'x' + options.height);
    params.push('scale=' + options.scale);
    params.push('center=' + options.center.lat + ',' + options.center.lon);
    params.push('key=' + key);
    params.push('zoom='+(options.zoom || '12'));
    params.push('maptype='+(options.mapType));
    return params.join('&');
};

StaticMap.prototype._getMapInfo = function(roleId) {
    return getStorage().get(this._state.roomId)
        .then(maps => {
            trace(`getting map for ${roleId}: ${JSON.stringify(maps)}`);
            return maps[roleId];
        });
};

StaticMap.prototype._recordUserMap = function(socket, map) {
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
            maps[socket.roleId] = map;
            getStorage().save(this._state.roomId, maps);
        })
        .then(() => trace(`Stored map for ${socket.roleId}: ${JSON.stringify(map)}`));
};



StaticMap.prototype._getMap = function(latitude, longitude, width, height, zoom, mapType) {
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

        cache.wrap(url, cacheCallback => {
            // Get the image -> not in cache!
            trace('request params:', options);
            trace('url is '+url);
            trace('Requesting new image from google!');
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
            trace('Sending the response!');
            // Set the headers
            response.set('cache-control', 'private, no-store, max-age=0');
            response.set('content-type', 'image/png');
            response.set('content-length', imageBuffer.length);
            response.set('connection', 'close');

            response.status(200).send(imageBuffer);
            trace('Sent the response!');
        });

    });
};

StaticMap.prototype.getMap = function(latitude, longitude, width, height, zoom){

    // this._getMap.bind(this, latitude, longitude, width, height, zoom);
    this._getMap(latitude, longitude, width, height, zoom, 'roadmap');

    return null;
};

StaticMap.prototype.getSatelliteMap = function(latitude, longitude, width, height, zoom){

    this._getMap(latitude, longitude, width, height, zoom, 'satellite');

    return null;
};


StaticMap.prototype.getTerrainMap = function(latitude, longitude, width, height, zoom){

    this._getMap(latitude, longitude, width, height, zoom, 'terrain');

    return null;
};
StaticMap.prototype.getXFromLongitude = function(longitude) {
    return this._getMapInfo(this.socket.roleId).then(mapInfo => {
        let pixels = this._pixelsAt(0,longitude, mapInfo);
        return pixels.x;
    });
};
//
StaticMap.prototype.getYFromLatitude = function(latitude) {
    return this._getMapInfo(this.socket.roleId).then(mapInfo => {
        let pixels = this._pixelsAt(latitude,0, mapInfo);
        return pixels.y;
    });
};

StaticMap.prototype.getLongitude = function(x){
    return this._getMapInfo(this.socket.roleId).then(mapInfo => {
        let coords = this._coordsAt(x,0, mapInfo);
        return coords.lon;
    });
};

StaticMap.prototype.getLatitude = function(y){
    return this._getMapInfo(this.socket.roleId).then(mapInfo => {
        let coords = this._coordsAt(0,y, mapInfo);
        return coords.lat;
    });
};

/**
 * Get the earth coordinates (latitude, longitude) of a given point in the last requested map image (x, y).
 * @param {Number} x x position of the point
 * @param {Number} y y position of the point
 * @returns {Array} A list containing the latitude and longitude of the given point.
 */

StaticMap.prototype.getEarthCoordinates = function(x, y){
    return this._getMapInfo(this.socket.roleId).then(mapInfo => {
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

StaticMap.prototype.getImageCoordinates = function(latitude, longitude){
    return this._getMapInfo(this.socket.roleId).then(mapInfo => {
        let pixels = this._pixelsAt(latitude, longitude, mapInfo);
        return [pixels.x, pixels.y];
    });
};


StaticMap.prototype.getDistance = function(startLatitude, startLongitude, endLatitude, endLongitude){
    return geolib.getDistance(
        {latitude: startLatitude, longitude: startLongitude},
        {latitude: endLatitude, longitude: endLongitude}
    );
};

// Getting current map settings
StaticMap.prototype._getUserMap = function() {
    var response = this.response;

    return this._getMapInfo(this.socket.roleId).then(map => {
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

        this._getMapInfo(this.socket.roleId).then(map => {

            if (!map) {
                response.send('ERROR: No map found. Please request a map and try again.');
            } else {
                response.json(map[minMax][attr]);
            }

        });

        return null;
    };
};

StaticMap.prototype.maxLongitude = mapGetter('max', 'lon');
StaticMap.prototype.maxLatitude = mapGetter('max', 'lat');
StaticMap.prototype.minLongitude = mapGetter('min', 'lon');
StaticMap.prototype.minLatitude = mapGetter('min', 'lat');

// Map of argument name to old field name
StaticMap.COMPATIBILITY = {
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

module.exports = StaticMap;

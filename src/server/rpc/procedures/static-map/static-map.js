// This is an RPC to provide access to Google maps and map utilities
//
// For end-user convenience, it is stateful and remembers the map lat,lng and
// size of the image for each user in the given group
'use strict';

var debug = require('debug'),
    log = debug('netsblox:rpc:static-map:log'),
    trace = debug('netsblox:rpc:static-map:trace'),
    request = require('request'),
    MercatorProjection = require('./mercator-projection'),
    CacheManager = require('cache-manager'),
    Storage = require('../../storage'),
    // TODO: Change this cache to mongo or something (file?)
    // This cache is shared among all StaticMap instances
    cache = CacheManager.caching({store: 'memory', max: 1000, ttl: Infinity}),
    key = process.env.GOOGLE_MAPS_KEY;

// TODO: check that the env variable is defined
var mercator = new MercatorProjection(),
    storage;

// Retrieving a static map image
var baseUrl = 'https://maps.googleapis.com/maps/api/staticmap',
    getStorage = function() {
        if (!storage) {
            storage = Storage.create('static-map');
        }
        return storage;
    };

var StaticMap = function(roomId) {
    this.roomId = roomId;
    this.userMaps = {};  // Store the state of the map for each user
};

StaticMap.getPath = function() {
    return '/staticmap';
};

StaticMap.prototype._getGoogleParams = function(options) {
    // Create the params for Google
    var params = [];
    // Double the scale if the image is too large (half the dimensions)
    options.scale = options.width <= 640 && options.height <= 640 ? 1 : 2;
    options.width = Math.ceil(options.width/options.scale);
    options.height = Math.ceil(options.height/options.scale);
    params.push('size=' + options.width + 'x' + options.height);
    params.push('scale=' + options.scale);

    params.push('center=' + options.lat + ',' + options.lon);
    params.push('key=' + key);
    params.push('zoom='+(options.zoom || '12'));
    return params.join('&');
};

StaticMap.prototype._getMapInfo = function(roleId) {
    return getStorage().get(this.roomId)
        .then(maps => {
            trace(`getting map for ${roleId}: ${JSON.stringify(maps)}`);
            return maps[roleId];
        });
};

StaticMap.prototype._recordUserMap = function(socket, options) {
    // Store the user's new map settings
    var center = {
            lat: options.lat,
            lng: options.lon
        },
        lngs = mercator.getLongitudes(center, options.zoom, options.width, options.height),
        lats = mercator.getLatitudes(center, options.zoom, options.width, options.height),
        map = {
            zoom: options.zoom,
            center: center,
            min: {
                lat: lats[0],
                lng: lngs[0]
            },
            max: {
                lat: lats[1],
                lng: lngs[1]
            },
            // Image info
            height: options.height,
            width: options.width
        };
        
    return getStorage().get(this.roomId)
        .then(maps => {
            maps = maps || {};
            maps[socket.roleId] = map;
            getStorage().save(this.roomId, maps);
        })
        .then(() => trace(`Stored map for ${socket.roleId}: ${JSON.stringify(map)}`));
};

StaticMap.prototype.getMap = function(latitude, longitude, width, height, zoom) {
    var response = this.response,
        options = {
            lat: latitude,
            lon: longitude,
            width: width,
            height: height,
            zoom: zoom
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

    return null;
};

StaticMap.prototype.getLongitude = function(x) {
    // Need lat, lng, width, zoom and x
    return this._getUserMap().then(map => {
        var center = map.center,
            zoom = map.zoom,
            width = map.width,
            lngs = map ? [map.min.lng, map.max.lng] :
                mercator.getLongitudes(center, zoom, width, 1),
            lngWidth,
            myLng;

        x = +x + (width/2);  // translate x from center to edge
        if (!map) {
            log('Map requested before creation from ' + this.socket.roleId);
        } else {
            trace('Map found for ' + this.socket.roleId + ': ' + JSON.stringify(map));
        }

        // Just approximate here
        trace('Longitudes are', lngs);
        // FIXME: Fix the "roll over"
        lngWidth = Math.abs(lngs[1] - lngs[0]);
        trace('width:', lngWidth);
        myLng = lngs[0] + (x/width)*lngWidth;
        trace('longitude:', myLng);
        return myLng;  // This may need to be made a little more accurate...
    });
};

StaticMap.prototype.getLatitude = function(y) {
    // Need lat, lng, height, zoom and x
    return this._getUserMap().then(map => {
        var center = map.center,
            zoom = map.zoom,
            height = map.height,
            lats = map ? [map.min.lat, map.max.lat] :
                mercator.getLatitudes(center, zoom, 1, height),
            latWidth,
            myLat;

        y = +y + (height/2);  // translate y from center to edge
        if (!map) {
            log('Map requested before creation from ' + this.socket.roleId);
        } else {
            trace('Map found for ' + this.socket.roleId + ': ' + JSON.stringify(map));
        }

        // Just approximate here
        trace('y is:', y);
        trace('Latitude window is', lats);
        latWidth = Math.abs(lats[1] - lats[0]);
        trace('window width is', latWidth);
        myLat = lats[0] + (y/height)*latWidth;
        trace('latitude:', myLat);
        return myLat;  // This may need to be made a little more accurate...
    });
};

StaticMap.prototype.getXFromLongitude = function(longitude) {
    var lng,
        proportion,
        x;

    return this._getUserMap().then(map => {
        lng = +longitude;
        proportion = (lng - map.min.lng)/(map.max.lng - map.min.lng);
        x = proportion*map.width - (map.width/2);  // Translate y to account for 0 in center

        trace('x value is ' + x);
        return x;
    });
};

StaticMap.prototype.getYFromLatitude = function(latitude) {
    var lat,
        proportion,
        y;

    return this._getUserMap().then(map => {
        lat = +latitude;
        proportion = (lat - map.min.lat)/(map.max.lat - map.min.lat);
        y = proportion*map.height - (map.height/2);  // Translate y to account for 0 in center

        trace('y value is ' + y);
        return y;
    });
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

StaticMap.prototype.maxLongitude = mapGetter('max', 'lng');
StaticMap.prototype.maxLatitude = mapGetter('max', 'lat');
StaticMap.prototype.minLongitude = mapGetter('min', 'lng');
StaticMap.prototype.minLatitude = mapGetter('min', 'lat');

// Map of argument name to old field name
StaticMap.COMPATIBILITY = {
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
};

module.exports = StaticMap;

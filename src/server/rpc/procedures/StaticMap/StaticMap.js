// This is an RPC to provide access to Google maps and map utilities
//
// For end-user convenience, it is stateful and remembers the map lat,lng and
// size of the image for each user in the given group
'use strict';

var debug = require('debug'),
    log = debug('NetsBlox:RPCManager:StaticMap:log'),
    trace = debug('NetsBlox:RPCManager:StaticMap:trace'),
    info = debug('NetsBlox:RPCManager:StaticMap:info'),
    request = require('request'),
    MercatorProjection = require('./MercatorProjection'),
    CacheManager = require('cache-manager'),
    // TODO: Change this cache to mongo or something (file?)
    // This cache is shared among all StaticMap instances
    cache = CacheManager.caching({store: 'memory', max: 1000, ttl: Infinity}),
    key = process.env.GOOGLE_MAPS_KEY;

var mercator = new MercatorProjection();

// Retrieving a static map image
var baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';

var StaticMap = function() {
    this.userMaps = {};  // Store the state of the map for each user
};

StaticMap.getPath = function() {
    return '/staticmap';
};

StaticMap.getActions = function() {
    return ['getMap',
            'getLatitude',
            'getLongitude',
            'minLongitude',
            'minLatitude',
            'maxLongitude',
            'maxLatitude',
            'getYFromLatitude',
            'getXFromLongitude'];
};

StaticMap.prototype._getGoogleParams = function(options) {
    // Create the params for Google
    var params = [];
    params.push('center=' + options.lat + ',' + options.lon);
    params.push('size=' + options.width + 'x' + options.height);
    params.push('key=' + key);
    params.push('zoom='+(options.zoom || '12'));
    return params.join('&');
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
        
    this.userMaps[socket.uuid] = map;

    trace('Stored map for ' + socket.uuid + ': ' + JSON.stringify(map));
};

StaticMap.prototype.getMap = function(req, res) {
    var params = this._getGoogleParams(req.query),
        url = baseUrl+'?'+params;

    this._recordUserMap(req.netsbloxSocket, req.query);
    // Check the cache
    cache.wrap(url, function(cacheCallback) {
        // Get the image -> not in cache!
        trace('request params:', req.query);
        trace('url is '+url);
        trace('Requesting new image from google!');
        var response = request.get(url);
        delete response.headers['cache-control'];

        // Gather the data...
        var result = new Buffer(0);
        response.on('data', function(data) {
            result = Buffer.concat([result, data]);
        });
        response.on('end', function() {
            return cacheCallback(null, result);
        });
    }, function(err, imageBuffer) {
        // Send the response to the user
        trace('Sending the response!');
        // Set the headers
        res.set('cache-control', 'private, no-store, max-age=0');
        res.set('content-type', 'image/png');
        res.set('content-length', imageBuffer.length);
        res.set('connection', 'close');

        res.status(200).send(imageBuffer);
        trace('Sent the response!');
    });
};

StaticMap.prototype.getLongitude = function(req, res) {
    // Need lat, lng, width, zoom and x
    var map = this.userMaps[req.netsbloxSocket.uuid] || {},
        center = map.center || {lat: req.query.lat, lng: req.query.lng},
        zoom = map.zoom || req.query.zoom,
        width = map.width || req.query.width,
        x = +req.query.x + (width/2),  // translate x from center to edge
        lngs = map ? [map.min.lng, map.max.lng] :
            mercator.getLongitudes(center, zoom, width, 1),
        lngWidth,
        myLng;

    if (!this.userMaps[req.netsbloxSocket.uuid]) {
        log('Map requested before creation from ' + req.netsbloxSocket.uuid);
    } else {
        trace('Map found for ' + req.netsbloxSocket.uuid + ': ' + JSON.stringify(map));
    }

    // Just approximate here
    trace('Longitudes are', lngs);
    // FIXME: Fix the "roll over"
    lngWidth = Math.abs(lngs[1] - lngs[0]);
    trace('width:', lngWidth);
    myLng = lngs[0] + (x/width)*lngWidth;
    trace('longitude:', myLng);
    return res.json(myLng);  // This may need to be made a little more accurate...
};

StaticMap.prototype.getLatitude = function(req, res) {
    // Need lat, lng, height, zoom and x
    var map = this.userMaps[req.netsbloxSocket.uuid] || {},
        center = map.center || {lat: req.query.lat, lng: req.query.lng},
        zoom = map.zoom || req.query.zoom,
        height = map.height || req.query.height,
        y = +req.query.y + (height/2),  // translate y from center to edge
        lats = map ? [map.min.lat, map.max.lat] :
            mercator.getLatitudes(center, zoom, 1, height),
        latWidth,
        myLat;

    if (!this.userMaps[req.netsbloxSocket.uuid]) {
        log('Map requested before creation from ' + req.netsbloxSocket.uuid);
    } else {
        trace('Map found for ' + req.netsbloxSocket.uuid + ': ' + JSON.stringify(map));
    }

    // Just approximate here
    trace('Latitude window is', lats);
    latWidth = Math.abs(lats[1] - lats[0]);
    trace('window width is', latWidth);
    myLat = lats[0] + (y/height)*latWidth;
    trace('latitude:', myLat);
    return res.json(myLat);  // This may need to be made a little more accurate...
};

StaticMap.prototype.getXFromLongitude = function(req, res) {
    var map = this.userMaps[req.netsbloxSocket.uuid],
        lng,
        proportion,
        x;

    if (!map) {
        log('Map requested before creation from ' + req.netsbloxSocket.uuid);
    }

    lng = req.query.lng;
    proportion = (lng - map.min.lng)/(map.max.lng - map.min.lng);
    x = proportion*map.width - (map.width/2);

    trace('x value is ' + x);
    return res.json(x);  // Translate y to account for 0 in center
};

StaticMap.prototype.getYFromLatitude = function(req, res) {
    var map = this.userMaps[req.netsbloxSocket.uuid],
        lat,
        proportion,
        y;

    if (!map) {
        log('Map requested before creation from ' + req.netsbloxSocket.uuid);
    }

    lat = req.query.lat;
    proportion = (lat - map.min.lat)/(map.max.lat - map.min.lat);
    y = proportion*map.height - (map.height/2);

    trace('y value is ' + y);
    return res.json(y);  // Translate y to account for 0 in center
};

// Getting current map settings
StaticMap.prototype.maxLongitude = function(req, res) {
    var map = this.userMaps[req.netsbloxSocket.uuid];
    return res.json(map.max.lng);
};

StaticMap.prototype.maxLatitude = function(req, res) {
    var map = this.userMaps[req.netsbloxSocket.uuid];
    return res.json(map.max.lat);
};

StaticMap.prototype.minLongitude = function(req, res) {
    var map = this.userMaps[req.netsbloxSocket.uuid];
    return res.json(map.min.lng);
};

StaticMap.prototype.minLatitude = function(req, res) {
    var map = this.userMaps[req.netsbloxSocket.uuid];
    return res.json(map.min.lat);
};

module.exports = StaticMap;

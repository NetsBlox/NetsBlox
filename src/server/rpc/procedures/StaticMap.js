// This is a static rpc collection. That is, it does not maintain state and is 
// shared across groups
'use strict';

var debug = require('debug'),
    log = debug('NetsBlox:RPCManager:StaticMap:log'),
    trace = debug('NetsBlox:RPCManager:StaticMap:trace'),
    info = debug('NetsBlox:RPCManager:StaticMap:info'),
    request = require('request'),
    key = process.env.GOOGLE_MAPS_KEY;

// Static Map Helper
// Thanks to http://stackoverflow.com/questions/12507274/how-to-get-bounds-of-a-google-static-map/12511820#12511820
// for the following mercator
var MERCATOR_RANGE = 256;
var bound = function (value, opt_min, opt_max) {
    if (opt_min !== null) {
        value = Math.max(value, opt_min);
    }
    if (opt_max !== null) {
        value = Math.min(value, opt_max);
    }
    return value;
};

var degreesToRadians = function(deg) {
    return deg * (Math.PI / 180);
};

var radiansToDegrees = function(rad) {
    return rad / (Math.PI / 180);
};

var MercatorProjection = function() {
    this.pixelOrigin_ = {x: MERCATOR_RANGE / 2, y: MERCATOR_RANGE / 2};
    this.pixelsPerLonDegree_ = MERCATOR_RANGE / 360;
    this.pixelsPerLonRadian_ = MERCATOR_RANGE / (2 * Math.PI);
};

MercatorProjection.prototype.fromLatLngToPoint = function(latLng, opt_point) {
    var me = this;

    var point = opt_point || {x:0, y:0};

    var origin = me.pixelOrigin_;
    point.x = origin.x + latLng.lng * me.pixelsPerLonDegree_;
    // NOTE(appleton): Truncating to 0.9999 effectively limits latitude to
    //   // 89.189.  This is about a third of a tile past the edge of the world tile.
    var siny = bound(Math.sin(degreesToRadians(latLng.lat)), -0.9999, 0.9999);
    point.y = origin.y + 0.5 * Math.log((1 + siny) / (1 - siny)) * -me.pixelsPerLonRadian_;
    return point;
};

MercatorProjection.prototype.fromPointToLatLng = function(point) {
    var me = this;

    var origin = me.pixelOrigin_;
    var lng = (point.x - origin.x) / me.pixelsPerLonDegree_;
    var latRadians = (point.y - origin.y) / -me.pixelsPerLonRadian_;
    var lat = radiansToDegrees(2 * Math.atan(Math.exp(latRadians)) - Math.PI / 2);
    return {lat: lat, lng: lng};
};

MercatorProjection.prototype.getLongitudes = function (center,zoom,mapWidth,mapHeight){
    return this.getCorners(center, zoom, mapWidth, mapHeight)
        .map(function(latlng) {
            return latlng.lng;
        });
};

MercatorProjection.prototype.getLatitudes = function (center,zoom,mapWidth,mapHeight){
    return this.getCorners(center, zoom, mapWidth, mapHeight)
        .map(function(latlng) {
            return latlng.lat;
        });
};

MercatorProjection.prototype.getCorners = function (center,zoom,mapWidth,mapHeight){
    var scale = Math.pow(2,zoom);
    var centerPx = this.fromLatLngToPoint(center);
    var SWPoint = {x: (centerPx.x -(mapWidth/2)/ scale) , y: (centerPx.y + (mapHeight/2)/ scale)};
    var SWLatLon = this.fromPointToLatLng(SWPoint);
    var NEPoint = {x: (centerPx.x +(mapWidth/2)/ scale) , y: (centerPx.y - (mapHeight/2)/ scale)};
    var NELatLon = this.fromPointToLatLng(NEPoint);
    return [SWLatLon, NELatLon];
};

var mercator = new MercatorProjection();

var getLngFromMapPoint = function(req, res) {
    // Need lat, lng, width, zoom and x
    var lat = req.query.lat,
        lng = req.query.lng,
        center = {lat: lat, lng: lng},
        zoom = req.query.zoom,
        width = req.query.width,
        x = req.query.x,
        lngs = mercator.getLongitudes(center, zoom, width, 1),
        lngWidth,
        myLng;

    // Just approximate here
    trace('Longitudes are', lngs);
    // FIXME: Fix the "roll over"
    lngWidth = Math.abs(lngs[1] - lngs[0]);
    trace('width:', lngWidth);
    myLng = lngs[0] + (x/width)*lngWidth;
    trace('longitude:', myLng);
    return res.json(myLng);  // This may need to be made a little more accurate...
};

var getLatFromMapPoint = function(req, res) {
    // Need lat, lng, height, zoom and x
    var lat = req.query.lat,
        lng = req.query.lng,
        center = {lat: lat, lng: lng},
        zoom = req.query.zoom,
        height = req.query.height,
        y = req.query.y,
        lats = mercator.getLatitudes(center, zoom, 1, height),
        latWidth,
        myLat;

    // Just approximate here
    trace('Latitude window is', lats);
    latWidth = Math.abs(lats[1] - lats[0]);
    trace('window width is', latWidth);
    myLat = lats[0] + (y/height)*latWidth;
    trace('latitude:', myLat);
    return res.json(myLat);  // This may need to be made a little more accurate...
};

// Retrieving a static map image
var baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';

var getGoogleParams = function(options) {
    var params = [];
    params.push('center=' + options.lat + ',' + options.lon);
    params.push('size=' + options.width + 'x' + options.height);
    params.push('key=' + key);
    params.push('zoom='+(options.zoom || '12'));
    return params.join('&');
};

var getStaticMapImage = function(req, res) {
    var params = getGoogleParams(req.query),
        url = baseUrl+'?'+params;

    trace('request params:', req.query);
    trace('url is '+url);
    request.get(url).pipe(res);
};

module.exports = {

    // This is very important => Otherwise it will try to instantiate this
    isStateless: true,

    // These next two functions are the same from the stateful RPC's
    getPath: function() {
        return '/staticmap';
    },

    getActions: function() {
        return ['getMap',
                'getLatitude',
                'getLongitude'];
    },

    // Actions
    getMap: getStaticMapImage,
    getLatitude: getLatFromMapPoint,
    getLongitude: getLngFromMapPoint
};

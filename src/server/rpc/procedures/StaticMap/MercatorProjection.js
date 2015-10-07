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

module.exports = MercatorProjection;

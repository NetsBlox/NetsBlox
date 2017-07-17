const ApiConsumer = require('../utils/api-consumer'),
    SphericalMercator = require('sphericalmercator'),
    Q = require('q'),
    merc = new SphericalMercator({size:256}),
    key = process.env.GOOGLE_MAPS_KEY;

let GoogleMap = new ApiConsumer('staticmap', 'https://maps.googleapis.com/maps/api/staticmap?');

GoogleMap._userMaps = {};

GoogleMap._getGoogleParams = function(options) {
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
    params.push('maptype='+(options.mapType));
    return params.join('&');
};

// returns coordinates based on a given pixelchange and existing map
GoogleMap._coordsAt = function(x, y, map) {
    let centerLl = [map.center.lon, map.center.lat];
    let centerPx = merc.px(centerLl, map.zoom);
    let targetPx = [centerPx[0] + parseInt(x), centerPx[1] - parseInt(y)];
    let targetLl = merc.ll(targetPx, map.zoom); // long lat
    let coords = {lat: targetLl[1], lon: targetLl[0]};
    return coords;
};

GoogleMap._pixelsAt = function(lat, lon, map) {
    // current latlon in px
    let curPx = merc.px([map.center.lon, map.center.lat], map.zoom);
    // new latlon in px
    let targetPx = merc.px([lon, lat], map.zoom);
    // difference in px
    let pixelsXY = {x: targetPx[0] - curPx[0], y: targetPx[1] - curPx[1]};
    return pixelsXY;
};

GoogleMap._getMapInfo = function(roleId) {
    // TODO no need to pass in the roleId just use this.socket.roleId
    let deferred = Q.defer();
    try {
        let map = this._userMaps[this.socket._room.uuid][roleId];
        if (!map) {
            this._logger.log('Map requested before creation from ' + this.socket.roleId);
            deferred.reject('No user map found for', roleId);
        } else {
            this._logger.trace('Map found for ' + this.socket.roleId + ': ' + JSON.stringify(map));
            deferred.resolve(map);
        }
    } catch (e) {
        deferred.reject('No user map found for', roleId);
    }
    return deferred.promise;
};

GoogleMap._recordUserMap = function(socket, options) {
    // Store the user's new map settings
    var center = {
        lat: options.lat,
        lon: options.lon
    };
    // get the corners of the image. We need to actully get both they are NOT "just opposite" of eachother.
    let northEastCornerCoords = this._coordsAt(options.width/2, options.height/2 , {center, zoom:options.zoom});
    let southWestCornerCoords = this._coordsAt(-options.width/2, -options.height/2 , {center, zoom:options.zoom});
    let map = {
        zoom: options.zoom,
        center: center,
        min: {
            lat: southWestCornerCoords.lat,
            lon: southWestCornerCoords.lon
        },
        max: {
            lat: northEastCornerCoords.lat,
            lon: northEastCornerCoords.lon
        },
        // Image info
        height: options.height,
        width: options.width
    };
    let roomId = socket._room.uuid;
    this._userMaps[roomId] = this._userMaps[roomId] || {};
    this._userMaps[roomId][socket.roleId] = map;
    return Promise.resolve();
};

GoogleMap._getMap = function(latitude, longitude, width, height, zoom, mapType) {
    var options = {
            lat: latitude,
            lon: longitude,
            width: width,
            height: height,
            zoom: zoom,
            mapType: mapType || 'roadmap'
        },
        params = this._getGoogleParams(options);

    return this._recordUserMap(this.socket, options).then(() => {
        return this._sendImage({queryString: params});
    });
};

GoogleMap.getMap = function(latitude, longitude, width, height, zoom){
    return this._getMap(latitude, longitude, width, height, zoom, 'roadmap');
};

GoogleMap.getSatelliteMap = function(latitude, longitude, width, height, zoom){
    return this._getMap(latitude, longitude, width, height, zoom, 'satellite');
};


GoogleMap.getTerrainMap = function(latitude, longitude, width, height, zoom){
    return this._getMap(latitude, longitude, width, height, zoom, 'terrain');
};

GoogleMap.getLatLong = function(x, y) {
    return this._getMapInfo(this.socket.roleId).then(mapInfo => {
        let coords = this._coordsAt(x,y, mapInfo);
        return [coords.lat, coords.lon];
    });
};


GoogleMap.getXY = function(latitude, longitude) {
    return this._getMapInfo(this.socket.roleId).then(mapInfo => {
        let pixels = this._pixelsAt(latitude,longitude, mapInfo);
        return [pixels.x, pixels.y];
    });
};

GoogleMap.getXFromLongitude = function(longitude) {
    return this._getMapInfo(this.socket.roleId).then(mapInfo => {
        let pixels = this._pixelsAt(0,longitude, mapInfo);
        return pixels.x;
    });
};
//
GoogleMap.getYFromLatitude = function(latitude) {
    return this._getMapInfo(this.socket.roleId).then(mapInfo => {
        let pixels = this._pixelsAt(latitude,0, mapInfo);
        return pixels.y;
    });
};

GoogleMap.getLongitude = function(x){
    return this._getMapInfo(this.socket.roleId).then(mapInfo => {
        let coords = this._coordsAt(x,0, mapInfo);
        return coords.lon;
    });
};

GoogleMap.getLatitude = function(y){
    return this._getMapInfo(this.socket.roleId).then(mapInfo => {
        let coords = this._coordsAt(0,y, mapInfo);
        return coords.lat;
    });
};

var mapGetter = function(minMax, attr) {
    return function() {
        return this._getMapInfo(this.socket.roleId).then(map => {
            return (map[minMax][attr]);
        });
    };
};

GoogleMap.maxLongitude = mapGetter('max', 'lon');
GoogleMap.maxLatitude = mapGetter('max', 'lat');
GoogleMap.minLongitude = mapGetter('min', 'lon');
GoogleMap.minLatitude = mapGetter('min', 'lat');


// Map of argument name to old field name
GoogleMap.COMPATIBILITY = {
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

module.exports = GoogleMap;

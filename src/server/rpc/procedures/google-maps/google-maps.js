// This is an RPC to provide access to Google maps and map utilities
//
// For end-user convenience, it is stateful and remembers the map lat,lng and
// size of the image for each user in the given group
'use strict';

const ApiConsumer = require('../utils/api-consumer'),
    SphericalMercator = require('sphericalmercator'),
    Storage = require('../../storage'),
    merc = new SphericalMercator({size:256}),
    KEY = process.env.GOOGLE_MAPS_KEY;

let GoogleMap = new ApiConsumer('GoogleMap', 'https://maps.googleapis.com/maps/api/staticmap?');

var storage;

GoogleMap._state = {};
GoogleMap._state.userMaps = {};
GoogleMap._state.roomId = {};

var getStorage = function() {
    if (!storage) {
        storage = Storage.create('static-map');
    }
    return storage;
};

GoogleMap._coordsAt = function(x, y, map) {
    x = Math.ceil(x / map.scale);
    y = Math.ceil(y / map.scale);
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
    let pixelsXY = {x: (targetPx[0] - curPx[0]), y: -(targetPx[1] - curPx[1])};
    pixelsXY = {x: pixelsXY.x * map.scale, y: pixelsXY.y * map.scale};
    return pixelsXY;
};

GoogleMap._getGoogleParams = function(options) {
    // Create the params for Google
    var params = [];
    params.push('size=' + options.width + 'x' + options.height);
    params.push('scale=' + options.scale);
    params.push('center=' + options.center.lat + ',' + options.center.lon);
    params.push('key=' + KEY);
    params.push('zoom='+(options.zoom || '12'));
    params.push('maptype='+(options.mapType));
    return params.join('&');
};

GoogleMap._getMapInfo = function(roleId) {
    return getStorage().get(this._state.roomId)
        .then(maps => {
            this._logger.trace(`getting map for ${roleId}: ${JSON.stringify(maps)}`);
            return maps[roleId];
        });
};

GoogleMap._recordUserMap = function(socket, map) {
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
        .then(() => this._logger.trace(`Stored map for ${socket.roleId}: ${JSON.stringify(map)}`));
};



GoogleMap._getMap = function(latitude, longitude, width, height, zoom, mapType) {
    let scale = width <= 640 && height <= 640 ? 1 : 2;

    let options = {
            center: {
                lat: latitude,
                lon: longitude,
            },
            width: width / scale,
            height: height / scale,
            zoom: zoom,
            scale,
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

// Getting current map settings
GoogleMap._getUserMap = function() {
    return this._getMapInfo(this.socket.roleId).then(map => {
        if (!map) {
            this.response.send('ERROR: No map found. Please request a map and try again.');
            return null;
        }
        return map;
    });
};

var mapGetter = function(minMax, attr) {
    return function() {

        this._getMapInfo(this.socket.roleId).then(map => {
            if (!map) {
                this.response.send('ERROR: No map found. Please request a map and try again.');
            } else {
                this.response.json(map[minMax][attr]);
            }
        });

        return null;
    };
};

GoogleMap.maxLongitude = mapGetter('max', 'lon');
GoogleMap.maxLatitude = mapGetter('max', 'lat');
GoogleMap.minLongitude = mapGetter('min', 'lon');
GoogleMap.minLatitude = mapGetter('min', 'lat');

// Map of argument name to old field name
GoogleMap.COMPATIBILITY = {
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

if (process.env.GOOGLE_MAPS_KEY) {
    module.exports = GoogleMap;
}else {
    console.log('ERROR: GoogleMap service and all its depndent examples will not work until you have GOOGLE_MAP_KEY env variable set to a valid api key');
}

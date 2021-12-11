/**
 * The NexradRadar Service provides access to the Google Maps API along with helper functions for interacting with the maps (such as converting coordinates).
 * For more information, check out https://developers.google.com/maps/documentation/static-maps/intro
 *
 * Terms of use: https://developers.google.com/maps/terms
 * @service
 */
'use strict';

const logger = require('../utils/logger')('nexrad-radar');
const utils = require('../utils');
const myUtils = require('./utils/index');
const ApiConsumer = require('../utils/api-consumer');
const {GoogleMapsKey} = require('../utils/api-key');
const SphericalMercator = require('sphericalmercator');
const geolib = require('geolib');
const merc = new SphericalMercator({size:256});
const Storage = require('../../storage');

const JIMP = require('jimp');
const { Level2Radar } = require('./libraries/nexrad-level-2-data/src/index');
const { plot, writePngToFile } = require('./libraries/nexrad-level-2-plot/src/index');
const AWS = require('aws-sdk');
const {sendEmptyRole} = require("../../../../../test/assets/utils");
const jimp = require("jimp");

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

const NEXRAD_SIZE = 3600;
// the range of nexrad-level-3-plot is 460km for radius
const RANGE = 460;
// the width of a pixel for nexrad-level-3-plot
const PIXELWIDTH = RANGE / (NEXRAD_SIZE / 2);
const BUCKET = 'noaa-nexrad-level2';
// configure aws-sdk
AWS.config.update({accessKeyId: 'AKIAULYK6YJBMWQW6FIU', secretAccessKey: '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', region: 'us-east-1'});
const s3 = new AWS.S3();

// We will rely on the default maxsize limit of the cache
const NexradRadar = new ApiConsumer('NexradRadar', baseUrl, {cache: {ttl: Infinity}});
ApiConsumer.setRequiredApiKey(NexradRadar, GoogleMapsKey);

let settings = {};
let map = null;
let nexrad = [];


NexradRadar._coordsAt = function(x, y, map) {
    x = Math.ceil(x / map.scale);
    y = Math.ceil(y / map.scale);
    let centerLl = [map.center.lon, map.center.lat];
    let centerPx = merc.px(centerLl, map.zoom);
    let targetPx = [centerPx[0] + parseInt(x), centerPx[1] - parseInt(y)];
    let targetLl = merc.ll(targetPx, map.zoom); // long lat
    let coords = {lat: targetLl[1], lon: targetLl[0]}
    if (coords.lon < -180) coords.lon = coords.lon + 360;
    if (coords.lon > 180) coords.lon = coords.lon - 360;
    return coords;
};

NexradRadar._pixelsAt = function(lat, lon, map) {
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

NexradRadar._toPrecision = function(number, precisionLimit) {
    return parseFloat(number).toFixed(precisionLimit);
};

NexradRadar._getGoogleParams = function(options) {
    const params = {
        size: `${options.width}x${options.height}`,
        scale: options.scale,
        center: `${options.center.lat},${options.center.lon}`,
        key: this.apiKey.value,
        zoom: options.zoom || 12,
        maptype: options.mapType
    };

    return utils.encodeQueryData(params, false);
};

NexradRadar._getDistanceFromLatLonInKm = function(lat1, lon1, lat2, lon2) {
    let p = 0.017453292519943295;    // Math.PI / 180
    let c = Math.cos;
    let a = 0.5 - c((lat2 - lat1) * p)/2 +
        c(lat1 * p) * c(lat2 * p) *
        (1 - c((lon2 - lon1) * p))/2;

    return 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
}

NexradRadar._setMap = async function(latitude, longitude, width, height, zoom) {
    const scale = width <= 640 && height <= 640 ? 1 : 2;
    settings = {
        center: {
            lat: NexradRadar._toPrecision(latitude, PRECISION),
            lon: NexradRadar._toPrecision(longitude, PRECISION)
        },
        width: (width / scale),
        height: (height / scale),
        zoom: zoom,
        scale,
        mapType: "terrain"
    };
    const queryString = this._getGoogleParams(settings);
    const cacheKey = JSON.stringify(settings);
    map = await this._requestImage({queryString, cacheKey});
    return this._sendImageBuffer(map);
};

NexradRadar._downloadSingle = async function(radar) {
    if(myUtils.RadarLocation.RadarLocation[radar] === undefined) return;
    const today = new Date();
    const tomorrow = new Date(today.getTime() + (24 * 60 * 60 * 1000));
    let params = {
        Bucket: BUCKET,
        Delimiter: '/',
        Prefix: `${tomorrow.getFullYear()}/${(tomorrow.getMonth() + 1).toString().padStart(2,'0')}/${tomorrow.getDate().toString().padStart(2,'0')}/${radar}/`
    };
    let dataTomorrow = await s3.listObjects(params).promise();
    if(dataTomorrow.Contents.length === 0) {
        params = {
            Bucket: BUCKET,
            Delimiter: '/',
            Prefix: `${today.getFullYear()}/${(today.getMonth() + 1).toString().padStart(2,'0')}/${today.getDate().toString().padStart(2,'0')}/${radar}/`
        };
        let dataToday = await s3.listObjects(params).promise();
        if(dataToday.Contents.length !== 0) {
            let nexradKey = dataToday.Contents[dataToday.Contents.length - 1].Key;
            if(nexradKey.substr(nexradKey.length - 3) === 'MDM') {
                nexradKey = dataToday.Contents[dataToday.Contents.length - 2].Key;
            }
            let nexradToday = await s3.getObject({Bucket: BUCKET, Key: nexradKey}).promise();
            nexrad.push([radar, nexradToday.Body]);
        }
    }
    else {
        let nexradKey = dataTomorrow.Contents[dataTomorrow.Contents.length - 1].Key;
        if(nexradKey.substr(nexradKey.length - 3) === 'MDM') {
            nexradKey = dataTomorrow.Contents[dataTomorrow.Contents.length - 2].Key;
        }
        let nexradTomorrow = await s3.getObject({Bucket: BUCKET, Key: nexradKey}).promise();
        nexrad.push([radar, nexradTomorrow.Body]);
    }
}

NexradRadar._downloadNexrads = async function(radars) {
    nexrad = [];
    let arr = [];
    for(let i = 0; i < radars.length; ++i) {
        arr.push(this._downloadSingle(radars[i]));
    }
    await Promise.all(arr);
}

NexradRadar._plotMap = async function() {
    if(map != null) return;
    const queryString = this._getGoogleParams(settings);
    const cacheKey = JSON.stringify(settings);
    map = await this._requestImage({queryString, cacheKey});
}

NexradRadar._plotFile = async function(data) {
    const tmp = new Level2Radar(data);
    const nexradPlot = plot(tmp, 'REF', {background: 'white'}).REF.canvas;
    return (nexradPlot
        .getContext('2d')
        .getImageData(0, 0, NEXRAD_SIZE, NEXRAD_SIZE));
}

NexradRadar._addHurricane = async function(radar, data) {
    let latCen = myUtils.RadarLocation.RadarLocation[radar][0];
    let lngCen = myUtils.RadarLocation.RadarLocation[radar][1];
    let boundingBox = myUtils.getBoundingBox(latCen, lngCen, RANGE);
    let xMin = this._pixelsAt(0, boundingBox.minLng, settings).x;
    let xMax = this._pixelsAt(0, boundingBox.maxLng, settings).x;
    let yMin = this._pixelsAt(boundingBox.minLat, 0, settings).y;
    let yMax = this._pixelsAt(boundingBox.maxLat, 0, settings).y;
    // plot nexrad first
    let nexradPlot = await this._plotFile(data);
    let plot = await JIMP.read(nexradPlot);
    // plot the map
    await this._plotMap();
    let mapImage = await JIMP.read(map);
    for (let i = xMin; i <= xMax; ++i) {
        for (let j = yMin; j <= yMax; ++j) {
            let mapX = Math.floor(i / settings.scale) + settings.width / 2;
            let mapY = settings.height / 2 - Math.floor(j / settings.scale);
            // only consider xy within the boundaries of google map image
            if (mapX >= 0 && mapX <= settings.width && mapY >= 0 && mapY <= settings.height) {
                let lat = this._coordsAt(0, j, settings).lat;
                let lng = this._coordsAt(i, 0, settings).lon;
                let disX = this._getDistanceFromLatLonInKm(latCen, lng, latCen, lngCen);
                let x = Math.round(disX / PIXELWIDTH);
                if (lng < lngCen) x *= -1;
                let disY = this._getDistanceFromLatLonInKm(lat, lngCen, latCen, lngCen);
                let y = Math.round(disY / PIXELWIDTH);
                if (lat < latCen) y *= -1;
                // int for white === 4294967295
                if (plot.getPixelColor(x + (NEXRAD_SIZE / 2), (NEXRAD_SIZE / 2) - y) !== 4294967295) {
                    mapImage.setPixelColor(plot.getPixelColor(x + (NEXRAD_SIZE / 2), (NEXRAD_SIZE / 2) - y), mapX, mapY);
                }
            }
        }
    }
    map = mapImage.bitmap;
}

NexradRadar._draw = async function() {
    let tmp = await JIMP.read(map);
    const imageBuffer = await new Promise((resolve, reject) => {
        tmp.getBuffer(JIMP.MIME_JPEG, (err, buffer) => {
            if (err) reject(err);
            else resolve(buffer);
        });
    });
    return this._sendImageBuffer(imageBuffer);
}

/**
 * Get a map image of the given region.
 * @param {Latitude} latitude Latitude of center point
 * @param {Longitude} longitude Longitude of center point
 * @param {BoundedInteger<1>} width Image width
 * @param {BoundedInteger<1>} height Image height
 * @param {BoundedInteger<1,25>} zoom Zoom level of map image
 * @returns {Image} Map image
 */
NexradRadar.setMap = function(latitude, longitude, width, height, zoom){
    return this._setMap(latitude, longitude, width, height, zoom);
};

/**
 * List all radars within the range of the current map.
 * @returns {Array<String>} Radars separated by a comma.
 */
NexradRadar.listRadars = function() {
    // const mapInfo = await this._getClientMap(this.caller.clientId);

    let latMin = this._coordsAt(0, settings.height / -2, settings).lat;
    let latMax = this._coordsAt(0, settings.height, settings).lat;
    let lngMin = this._coordsAt(settings.width / -2, 0, settings).lon;
    let lngMax = this._coordsAt(settings.width / 2, 0, settings).lon;
    let res = [];
    for(let i in myUtils.RadarLocation.RadarLocation) {
        if(myUtils.RadarLocation.RadarLocation[i][0] > latMin
            && myUtils.RadarLocation.RadarLocation[i][0] < latMax
            && myUtils.RadarLocation.RadarLocation[i][1] > lngMin
            && myUtils.RadarLocation.RadarLocation[i][1] < lngMax) {
            res.push(i);
        }
    }
    return res;
}

/**
 * Add multiple hurricane plots onto the current google static map.
 * @param {String} radars-separated-by-a-comma Radars.
 * @returns {Image} Map image.
 */
NexradRadar.plotRadars = async function(radars) {
    radars = radars.split(',');
    map = null;
    if(radars.length === 0) {
        await this._plotMap();
        return this._sendImageBuffer(map);
    }
    await this._downloadNexrads(radars);
    await this._plotMap();
    for(let i = 0; i < nexrad.length; ++i) {
        await this._addHurricane(nexrad[i][0], nexrad[i][1]);
    }
    await this._draw();
}
/**
 * Add multiple all radar plots onto the current google static map.
 * @returns {Image} Map image.
 */
NexradRadar.plotAllRadars = async function() {
    let allRadars = this.listRadars().join(',').toString();
    await this.plotRadars(allRadars);
    await this._draw();
}


// Map of argument name to old field name
NexradRadar.COMPATIBILITY = {
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

module.exports = NexradRadar;

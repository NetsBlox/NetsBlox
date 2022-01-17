/**
 * The Nexrad Rader Service provides access to the nexrad-level2 REF plots.
 * For more information, check out https://www.ncei.noaa.gov/access/metadata/landing-page/bin/iso?id=gov.noaa.ncdc:C00345
 *
 * @alpha
 */
'use strict';

const utils = require('../utils');
const ApiConsumer = require('../utils/api-consumer');
const {GoogleMapsKey} = require('../utils/api-key');
const SphericalMercator = require('sphericalmercator');
const merc = new SphericalMercator({size:256});
const JIMP = require('jimp');
const { Level2Radar } = require('nexrad-level-2-data');
const { plot } = require('nexrad-level-2-plot');
const AWS = require('aws-sdk');
const types = require('../../input-types');
const RADAR_LOCATIONS = require('./RadarLocations');
const _ = require('lodash');

const PRECISION = 7; // 6 or 5 is probably safe
const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap'; // url for google static map
const NEXRAD_SIZE = 3600; // size of a nexrad radar image
const RANGE = 460; // the range of nexrad-level-3-plot is 460km for radius
const PIXELWIDTH = RANGE / (NEXRAD_SIZE / 2); // the width of a pixel for nexrad-level-3-plot
const BUCKET = 'noaa-nexrad-level2'; // bucket name for aws nexrad service

// configure aws-sdk
AWS.config.update({accessKeyId: 'AKIAULYK6YJBMWQW6FIU', secretAccessKey: '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', region: 'us-east-1'});
const s3 = new AWS.S3();

// We will rely on the default maxsize limit of the cache
const NexradRadar = new ApiConsumer('NexradRadar', baseUrl, {cache: {ttl: Infinity}});
ApiConsumer.setRequiredApiKey(NexradRadar, GoogleMapsKey);

// define mapTypes
const MAPTYPES = ['none', 'roadmap', 'terrain', 'satellite'];
types.defineType({
    name: 'MapType',
    description: 'Possible options for generating a google static map.',
    baseType: 'Enum',
    baseParams: MAPTYPES
});

async function renderJIMPImage(data, width, height) {
    let image = await new JIMP(width, height);
    for (let x = 0; x < width; x++) {
        for (let y = 0; y < height; y++) {
            const dataIndex = (y * width * 4) + (x * 4);
            if (!(data[dataIndex] === 0 && data[dataIndex + 1] === 0 && data[dataIndex + 2] === 0 && data[dataIndex + 3] === 0)) {
                image.setPixelColour(JIMP.rgbaToInt(data[dataIndex], data[dataIndex + 1], data[dataIndex + 2], data[dataIndex + 3]), x, y);
            }
        }
    }
    return image;
}

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
    const curPx = merc.px([map.center.lon, map.center.lat], map.zoom); // current latlon in px
    const targetPx = merc.px([lon, lat], map.zoom); // new latlon in px
    const pixelsXY = {x: (targetPx[0] - curPx[0]), y: -(targetPx[1] - curPx[1])}; // difference in px
    return {x: pixelsXY.x * map.scale, y: pixelsXY.y * map.scale}; // adjust it to map's scale
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
};

NexradRadar._getBoundingBox = function(fsLatitude, fsLongitude, fiDistanceInKM) {
    if (fiDistanceInKM === null || fiDistanceInKM === undefined || fiDistanceInKM === 0)
        fiDistanceInKM = 1;
    let MIN_LAT, MAX_LAT, MIN_LON, MAX_LON, ldEarthRadius, ldDistanceInRadius, lsLatitudeInDegree, lsLongitudeInDegree,
        lsLatitudeInRadius, lsLongitudeInRadius, lsMinLatitude, lsMaxLatitude, lsMinLongitude, lsMaxLongitude, deltaLon;
    const degreeToRadius = (num) => {
        return num * (Math.PI / 180);
    }
    const radiusToDegree = (rad) => {
        return (180 * rad) / Math.PI;
    }
    // coordinate limits
    MIN_LAT = degreeToRadius(-90);
    MAX_LAT = degreeToRadius(90);
    MIN_LON = degreeToRadius(-180);
    MAX_LON = degreeToRadius(180);
    // Earth's radius (km)
    ldEarthRadius = 6378.1;
    // angular distance in radians on a great circle
    ldDistanceInRadius = fiDistanceInKM / ldEarthRadius;
    // center point coordinates (deg)
    lsLatitudeInDegree = fsLatitude;
    lsLongitudeInDegree = fsLongitude;
    // center point coordinates (rad)
    lsLatitudeInRadius = degreeToRadius(lsLatitudeInDegree);
    lsLongitudeInRadius = degreeToRadius(lsLongitudeInDegree);
    // minimum and maximum latitudes for given distance
    lsMinLatitude = lsLatitudeInRadius - ldDistanceInRadius;
    lsMaxLatitude = lsLatitudeInRadius + ldDistanceInRadius;
    // minimum and maximum longitudes for given distance
    lsMinLongitude = void 0;
    lsMaxLongitude = void 0;
    // define deltaLon to help determine min and max longitudes
    deltaLon = Math.asin(Math.sin(ldDistanceInRadius) / Math.cos(lsLatitudeInRadius));
    if (lsMinLatitude > MIN_LAT && lsMaxLatitude < MAX_LAT) {
        lsMinLongitude = lsLongitudeInRadius - deltaLon;
        lsMaxLongitude = lsLongitudeInRadius + deltaLon;
        if (lsMinLongitude < MIN_LON) {
            lsMinLongitude = lsMinLongitude + 2 * Math.PI;
        }
        if (lsMaxLongitude > MAX_LON) {
            lsMaxLongitude = lsMaxLongitude - 2 * Math.PI;
        }
    }
    // a pole is within the given distance
    else {
        lsMinLatitude = Math.max(lsMinLatitude, MIN_LAT);
        lsMaxLatitude = Math.min(lsMaxLatitude, MAX_LAT);
        lsMinLongitude = MIN_LON;
        lsMaxLongitude = MAX_LON;
    }

    return {
        minLat: radiusToDegree(lsMinLatitude),
        minLng: radiusToDegree(lsMinLongitude),
        maxLat: radiusToDegree(lsMaxLatitude),
        maxLng: radiusToDegree(lsMaxLongitude)
    };
};

NexradRadar._configureMap = function(latitude, longitude, width, height, zoom, mapType) {
    const scale = width <= 640 && height <= 640 ? 1 : 2;
    return {
        center: {
            lat: NexradRadar._toPrecision(latitude, PRECISION),
            lon: NexradRadar._toPrecision(longitude, PRECISION)
        },
        width: (width / scale),
        height: (height / scale),
        zoom: zoom,
        scale,
        mapType,
    };
};

NexradRadar._downloadSingle = async function(radar) {
    if (RADAR_LOCATIONS[radar] === undefined) return '';
    const today = new Date();
    const tomorrow = new Date(today.getTime() + (24 * 60 * 60 * 1000));
    let params = {
        Bucket: BUCKET,
        Delimiter: '/',
        Prefix: `${tomorrow.getFullYear()}/${(tomorrow.getMonth() + 1).toString().padStart(2,'0')}/${tomorrow.getDate().toString().padStart(2,'0')}/${radar}/`
    };
    let dataTomorrow = await s3.listObjects(params).promise();
    if (dataTomorrow.Contents.length === 0) {
        params = {
            Bucket: BUCKET,
            Delimiter: '/',
            Prefix: `${today.getFullYear()}/${(today.getMonth() + 1).toString().padStart(2,'0')}/${today.getDate().toString().padStart(2,'0')}/${radar}/`
        };
        let dataToday = await s3.listObjects(params).promise();
        if (dataToday.Contents.length !== 0) {
            let nexradKey = dataToday.Contents[dataToday.Contents.length - 1].Key;
            if (nexradKey.substr(nexradKey.length - 3) === 'MDM') {
                nexradKey = dataToday.Contents[dataToday.Contents.length - 2].Key;
            }
            let nexradToday = await s3.getObject({Bucket: BUCKET, Key: nexradKey}).promise();
            return nexradToday.Body;
        }
    }
    else {
        let nexradKey = dataTomorrow.Contents[dataTomorrow.Contents.length - 1].Key;
        if (nexradKey.substr(nexradKey.length - 3) === 'MDM') {
            nexradKey = dataTomorrow.Contents[dataTomorrow.Contents.length - 2].Key;
        }
        let nexradTomorrow = await s3.getObject({Bucket: BUCKET, Key: nexradKey}).promise();
        return nexradTomorrow.Body;
    }
    return '';
};

NexradRadar._getMap = async function(settings) {
    const queryString = this._getGoogleParams(settings);
    const cacheKey = JSON.stringify(settings);
    const data = await this._requestImage({queryString, cacheKey});
    return await JIMP.read(data);
};

NexradRadar._parseNexrad = function(data) {
    const tmp = new Level2Radar(data);
    const nexradPlot = plot(tmp, 'REF', {background: 'white', elevation: 1}).REF.canvas;
    return (nexradPlot
        .getContext('2d')
        .getImageData(0, 0, NEXRAD_SIZE, NEXRAD_SIZE));
};

NexradRadar._filterRadars = async function(radars, settings, zoom) {
    const cen = this._coordsAt(0, 0, settings);
    let bound = 0;
    if(zoom <= 4) bound = RANGE * 1.5;
    else if(zoom <= 8) bound = RANGE * 0.5;
    else bound = RANGE * 0.3;
    radars.sort((a, b) => {
        let disA = this._getDistanceFromLatLonInKm(RADAR_LOCATIONS[a][0], RADAR_LOCATIONS[a][1], cen.lat, cen.lon);
        let disB = this._getDistanceFromLatLonInKm(RADAR_LOCATIONS[b][0], RADAR_LOCATIONS[b][1], cen.lat, cen.lon);
        return disB - disA;
    });
    for(let i = 0; i < radars.length; ++i) {
        for(let j = radars.length - 1; j > i; --j) {
            if(this._getDistanceFromLatLonInKm(RADAR_LOCATIONS[radars[i]][0], RADAR_LOCATIONS[radars[i]][1], RADAR_LOCATIONS[radars[j]][0], RADAR_LOCATIONS[radars[j]][1]) <= bound) {
                radars.splice(j, 1);
            }
        }
    }
    return radars;
}

NexradRadar._addRadarPlot = async function(radar, plot, radarPlot, settings) {
    const [latCen, lngCen] = RADAR_LOCATIONS[radar];
    const boundingBox = this._getBoundingBox(latCen, lngCen, RANGE);

    const c1 = this._pixelsAt(boundingBox.minLat, boundingBox.minLng, settings);
    const c2 = this._pixelsAt(boundingBox.maxLat, boundingBox.maxLng, settings);
    const xMin = c1.x, yMin = c1.y;
    const xMax = c2.x, yMax = c2.y;

    for (let i = xMin; i <= xMax; ++i) {
        const mapX = Math.floor(i / settings.scale) + settings.width / 2;
        if (mapX < 0 || mapX > settings.width) continue;

        const lng = this._coordsAt(i, 0, settings).lon;
        const disX = this._getDistanceFromLatLonInKm(latCen, lng, latCen, lngCen);
        const x = Math.sign(lng - lngCen) * Math.round(disX / PIXELWIDTH);

        for (let j = yMin; j <= yMax; ++j) {
            const mapY = settings.height / 2 - Math.floor(j / settings.scale);
            if (mapY < 0 || mapY > settings.height) continue;

            const lat = this._coordsAt(0, j, settings).lat;
            const disY = this._getDistanceFromLatLonInKm(lat, lngCen, latCen, lngCen);
            const y = Math.sign(lat - latCen) * Math.round(disY / PIXELWIDTH);

            const pxColor = plot.getPixelColor(x + NEXRAD_SIZE / 2, NEXRAD_SIZE / 2 - y);
            if (pxColor !== 0xffffffff) radarPlot.setPixelColor(pxColor, mapX, mapY);
        }
    }
};

NexradRadar._draw = async function(imageData, response) {
    const imageBuffer = await new Promise((resolve, reject) => {
        imageData.quality(100).getBuffer(JIMP.MIME_PNG, (err, buffer) => {
            if (err) reject(err);
            else resolve(buffer);
        });
    });
    return utils.sendImageBuffer(response, imageBuffer);
};

/**
 * List all the radars which would be visible with the given map settings.
 *
 * @param {Latitude} latitude Latitude of center point
 * @param {Longitude} longitude Longitude of center point
 * @param {BoundedInteger<1>} width Image width
 * @param {BoundedInteger<1>} height Image height
 * @param {BoundedInteger<1,25>} zoom Zoom level of map image
 * @returns {Array<String>} list of radars with viible coverage
 */
NexradRadar.listRadars = function(latitude, longitude, width, height, zoom) {
    const res = [];
    if(zoom === 1 || zoom === 2) {
        for (const i in RADAR_LOCATIONS) {
            res.push(i);
            
        }
        return res;
    }
    const settings = this._configureMap(latitude, longitude, width, height, zoom, 'terrain');

    let latMin = this._coordsAt(0, settings.height / -2, settings).lat;
    let latMax = this._coordsAt(0, settings.height, settings).lat;
    let lngMin = this._coordsAt(settings.width / -2, 0, settings).lon;
    let lngMax = this._coordsAt(settings.width / 2, 0, settings).lon;
    latMin = this._getBoundingBox(latMin, lngMin, RANGE).minLat;
    latMax = this._getBoundingBox(latMax, lngMax, RANGE).maxLat;
    lngMin = this._getBoundingBox(latMin, lngMin, RANGE).minLng;
    lngMax = this._getBoundingBox(latMax, lngMax, RANGE).maxLng;
    
    for (const i in RADAR_LOCATIONS) {
        const [lat, lng] = RADAR_LOCATIONS[i];
        if (lat >= latMin && lat <= latMax && lng >= lngMin && lng <= lngMax) {
            res.push(i);
        }
    }
    return res;
};

/**
 * Draw radar overlays on a GoogleMaps image.
 *
 * @param {Latitude} latitude Latitude of center point
 * @param {Longitude} longitude Longitude of center point
 * @param {BoundedInteger<1>} width Image width
 * @param {BoundedInteger<1>} height Image height
 * @param {BoundedInteger<1,25>} zoom GoogleMaps zoom level
 * @param {MapType} mapType Type of map background to use
 * @param {Array<String>=} radars List of radars to render on the overlay. If not provided, renders all visible radars.
 * @returns {Image} The requested map with radar overlay
 */
NexradRadar.plotRadarImages = async function(latitude, longitude, width, height, zoom, mapType, radars=null) {
    const settings = await this._configureMap(latitude, longitude, width, height, zoom, mapType);
    if (!radars) {
        radars = await this.listRadars(latitude, longitude, width, height, zoom);
        radars = await this._filterRadars(radars, settings, zoom);
    }
    else if(radars.length > 5) {
        radars = await this._filterRadars(radars, settings, zoom);
    }
    const radarPlot = await new JIMP(settings.width, settings.height, 0x0);

    const allRadarsData = await Promise.all(radars.map(this._downloadSingle));
    const [usedRadars, radarsData] = _.unzip(_.zip(radars, allRadarsData).filter(s => s[1]));
    const radarsParsed = await Promise.all(radarsData.map(this._parseNexrad));
    const radarsImgs = await Promise.all(radarsParsed.map(p => renderJIMPImage(p.data, NEXRAD_SIZE, NEXRAD_SIZE)));
    await Promise.all(_.zip(usedRadars, radarsImgs).map(v => this._addRadarPlot(v[0], v[1], radarPlot, settings)));

    if (mapType !== 'none') {
       const map = await this._getMap(settings);
       await map.composite(radarPlot, 0, 0);
       await this._draw(map, this.response);
    }
    else await this._draw(radarPlot, this.response);
};

module.exports = NexradRadar;

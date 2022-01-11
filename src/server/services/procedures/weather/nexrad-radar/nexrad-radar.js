/**
 * The Nexrad Rader Service provides access to the nexrad-level2 REF plots.
 * For more information, check out https://www.ncei.noaa.gov/access/metadata/landing-page/bin/iso?id=gov.noaa.ncdc:C00345
 *
 */
 'use strict';

 const utils = require('../../utils');
 const ApiConsumer = require('../../utils/api-consumer');
 const {GoogleMapsKey} = require('../../utils/api-key');
 const SphericalMercator = require('sphericalmercator');
 const merc = new SphericalMercator({size:256});
 const JIMP = require('jimp');
 const { Level2Radar } = require('nexrad-level-2-data');
 const { plot } = require('nexrad-level-2-plot');
 const AWS = require('aws-sdk');
 const types = require('../../../input-types');
 let RADAR_LOCATIONS = require('./RadarLocations');
 
 const PRECISION = 7; // 6 or 5 is probably safe
 // url for google static map
 const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';
 // size of a nexrad radar image
 const NEXRAD_SIZE = 3600;
 // the range of nexrad-level-3-plot is 460km for radius
 const RANGE = 460;
 // the width of a pixel for nexrad-level-3-plot
 const PIXELWIDTH = RANGE / (NEXRAD_SIZE / 2);
 // bucket name for aws nexrad service
 const BUCKET = 'noaa-nexrad-level2';


 // configure aws-sdk
 AWS.config.update({accessKeyId: process.env.AWS_ID, secretAccessKey: process.env.AWS_KEY, region: 'us-east-1'});
 const s3 = new AWS.S3();
 
 // We will rely on the default maxsize limit of the cache
 const NexradRadar = new ApiConsumer('NexradRadar', baseUrl, {cache: {ttl: Infinity}});
 ApiConsumer.setRequiredApiKey(NexradRadar, GoogleMapsKey);
 
 // initialize global varibles for NexradRadar
 let settings = {};
 let map = null;
 let nexrad = [];
 let radarPlot = null;

// define mapTypes
const MAPTYPES = ['none', 'roadmap', 'terrain', 'satellite'];
types.defineType({
    name: 'MapType',
    description: 'Possible options for generating a google static map.',
    baseType: 'Enum',
    baseParams: MAPTYPES
});

 const renderJIMPImage = async (data, width, height) => {
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
 }
 
 NexradRadar._configureMap = function(latitude, longitude, width, height, zoom, type) {
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
         mapType: type
     };
 }    
 
 NexradRadar._downloadSingle = async function(radar) {
     if(RADAR_LOCATIONS[radar] === undefined) return "";
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
             return nexradToday.Body;
         }
     }
     else {
         let nexradKey = dataTomorrow.Contents[dataTomorrow.Contents.length - 1].Key;
         if(nexradKey.substr(nexradKey.length - 3) === 'MDM') {
             nexradKey = dataTomorrow.Contents[dataTomorrow.Contents.length - 2].Key;
         }
         let nexradTomorrow = await s3.getObject({Bucket: BUCKET, Key: nexradKey}).promise();
         return nexradTomorrow.Body;
     }
     return "";
 }
 
 NexradRadar._addMap = async function() {
     const queryString = this._getGoogleParams(settings);
     const cacheKey = JSON.stringify(settings);
     let data = await this._requestImage({queryString, cacheKey});
     map = await JIMP.read(data);
 }
 
 NexradRadar._parseNexrad = function(data) {
    const tmp = new Level2Radar(data);
    const nexradPlot = plot(tmp, 'REF', {background: 'white', elevation: 1}).REF.canvas;
    return (nexradPlot
        .getContext('2d')
        .getImageData(0, 0, NEXRAD_SIZE, NEXRAD_SIZE));
 }
 
 NexradRadar._addHurricane = async function(radar, plot) {
     let latCen = RADAR_LOCATIONS[radar][0];
     let lngCen = RADAR_LOCATIONS[radar][1];
     let boundingBox = this._getBoundingBox(latCen, lngCen, RANGE);
     let xMin = this._pixelsAt(0, boundingBox.minLng, settings).x;
     let xMax = this._pixelsAt(0, boundingBox.maxLng, settings).x;
     let yMin = this._pixelsAt(boundingBox.minLat, 0, settings).y;
     let yMax = this._pixelsAt(boundingBox.maxLat, 0, settings).y;
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
                     radarPlot.setPixelColor(plot.getPixelColor(x + (NEXRAD_SIZE / 2), (NEXRAD_SIZE / 2) - y), mapX, mapY);
                 }
             }
         }
     }
 }
 
  NexradRadar._draw = async function(imageData, response) {
     const imageBuffer = await new Promise((resolve, reject) => {
         imageData.quality(100).getBuffer(JIMP.MIME_JPEG, (err, buffer) => {
             if (err) reject(err);
             else resolve(buffer);
         });
     });
     return utils.sendImageBuffer(response, imageBuffer);
 }

 NexradRadar._plotSingleRadar = async function(radar) {
    let radarData = await this._downloadSingle(radar);
    if(radarData === "") return;
    let tmp = await this._parseNexrad(radarData);
    let radarImage = await renderJIMPImage(tmp.data, NEXRAD_SIZE, NEXRAD_SIZE);
    await this._addHurricane(radar, radarImage);
 }
 
 NexradRadar._clear = function() {
     settings = {};
     map = null;
     nexrad = [];
     radarPlot = null;
 }

 NexradRadar._listRadars = function(latitude, longitude, width, height, zoom) {
    this._configureMap(latitude, longitude, width, height, zoom, 'terrain');
     let latMin = this._coordsAt(0, settings.height / -2, settings).lat;
     let latMax = this._coordsAt(0, settings.height, settings).lat;
     let lngMin = this._coordsAt(settings.width / -2, 0, settings).lon;
     let lngMax = this._coordsAt(settings.width / 2, 0, settings).lon;
     let res = [];
     for(let i in RADAR_LOCATIONS) {
         if(RADAR_LOCATIONS[i][0] > latMin
             && RADAR_LOCATIONS[i][0] < latMax
             && RADAR_LOCATIONS[i][1] > lngMin
             && RADAR_LOCATIONS[i][1] < lngMax) {
             res.push(i);
         }
     }
     return res;
 }

 NexradRadar._plotAllRadarImages = async function(latitude, longitude, width, height, zoom, type, response) {
    let radars = await this._listRadars(latitude, longitude, width, height, zoom);
    await this._configureMap(latitude, longitude, width, height, zoom, type);
     radarPlot = await new JIMP(settings.width, settings.height, 0x0);
     await Promise.all(radars.map(radar => this._plotSingleRadar(radar)));
     if(type !== 'none') {
        await this._addMap();
        await map.composite(radarPlot, 0, 0);
        await this._draw(map, response);
     }
     else await this._draw(radarPlot, response);
     this._clear();
 }
 
  NexradRadar._plotRadarImages = async function(latitude, longitude, width, height, zoom, radars, type, response) {
    await this._configureMap(latitude, longitude, width, height, zoom, type);
    radarPlot = await new JIMP(settings.width, settings.height, 0x0);
    await Promise.all(radars.map(radar => this._plotSingleRadar(radar)));
    if(type !== 'none') {
       await this._addMap();
       await map.composite(radarPlot, 0, 0);
       await this._draw(map, response);
    }
    else await this._draw(radarPlot, response);
    this._clear();
 }
 
 module.exports = NexradRadar;
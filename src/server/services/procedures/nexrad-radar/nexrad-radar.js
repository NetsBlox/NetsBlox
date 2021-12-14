/**
 * The Nexrad Rader Service provides access to the nexrad-level2 REF plots.
 * For more information, check out https://www.ncei.noaa.gov/access/metadata/landing-page/bin/iso?id=gov.noaa.ncdc:C00345
 *
 * @service
 */
'use strict';

const utils = require('../utils');
const ApiConsumer = require('../utils/api-consumer');
const {GoogleMapsKey} = require('../utils/api-key');
const SphericalMercator = require('sphericalmercator');
const merc = new SphericalMercator({size:256});
const JIMP = require('jimp');
const { Level2Radar } = require('./libraries/nexrad-level-2-data/src/index');
const { plot } = require('./libraries/nexrad-level-2-plot/src/index');
const AWS = require('aws-sdk');
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
AWS.config.update({accessKeyId: 'AKIAULYK6YJBMWQW6FIU', secretAccessKey: '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', region: 'us-east-1'});
const s3 = new AWS.S3();

// We will rely on the default maxsize limit of the cache
const NexradRadar = new ApiConsumer('NexradRadar', baseUrl, {cache: {ttl: Infinity}});
ApiConsumer.setRequiredApiKey(NexradRadar, GoogleMapsKey);

// initialize global varibles for NexradRadar
let settings = {};
let map = null;
let nexrad = [];
let radarPlot = null;

/**
 * Transform from xy to latlng.
 * @param {Number} x x coordinate of the image
 * @param {Number} y y coordinate of the image
 * @param {Object} map settings of the map
 * @returns {Array} latlng coordinates
 */
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

/**
 * Transform from latlng to xy.
 * @param {Latitude} lat latitiude of the pixel
 * @param {Longitude} lon longitude of the pixel
 * @param {Object} settings of the map
 * @returns {Array} xy coordinates of the pixel
 */
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

/**
 * ParseFloat a number based on a given percision.
 * @param {Number} number the number to be parsed
 * @param {Number} precisionLimit the given precision
 * @returns {Number} the parsed number
 */
NexradRadar._toPrecision = function(number, precisionLimit) {
    return parseFloat(number).toFixed(precisionLimit);
};

/**
 * Set the parameters for google static map.
 * @param {Object} options settings of the map
 * @returns {String} googleParams
 */
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
/**
 * Get the distance between two points in LatLng
 * @param   {Latitude} lat1 latitude of the first point
 * @param   {Longitude} lon1 longitude of the first point
 * @param   {Latitude} lat2 latitude of the second point
 * @param   {Longitude}lon2 longitude of the second point
 * @returns {Number} distance in km
 */
NexradRadar._getDistanceFromLatLonInKm = function(lat1, lon1, lat2, lon2) {
    let p = 0.017453292519943295;    // Math.PI / 180
    let c = Math.cos;
    let a = 0.5 - c((lat2 - lat1) * p)/2 +
        c(lat1 * p) * c(lat2 * p) *
        (1 - c((lon2 - lon1) * p))/2;
    return 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km
}

/**
 * Get the bounding box of the current LatLng with a given distance.
 * @param   {Number} fsLatitude latitude
 * @param   {Number} fsLongitude longitude
 * @param   {Number} fiDistanceInKM distance from center in km
 * @returns {Object} boundingBox
 */
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

/**
 * Configure a google static map.
 * @param   {Latitude} latitude latitude of the center
 * @param   {Longitude} longitude longitude of the center
 * @param   {Number} width width of the map
 * @param   {Number} height height of the map
 * @param   {Number} zoom zoom level of the map
 * @param   {String} type Map type
 */
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

/**
 * A helper method for downloadNexrad that downloads for a single radar station.
 * @param {String} radar name of NEXRAD radar.
 */
NexradRadar._downloadSingle = async function(radar) {
    if(RADAR_LOCATIONS[radar] === undefined) return;
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

/**
 * An auto-downloader of up-to-date NEXRAD files.
 * @param {Array} radars the radars whose up-to-date files we want to download.
 */
NexradRadar._downloadNexrads = async function(radars) {
    nexrad = [];
    let arr = [];
    for(let i = 0; i < radars.length; ++i) {
        arr.push(this._downloadSingle(radars[i]));
    }
    await Promise.all(arr);
}

/**
 * Add the google static map.
 */
NexradRadar._addMap = async function() {
    const queryString = this._getGoogleParams(settings);
    const cacheKey = JSON.stringify(settings);
    let data = await this._requestImage({queryString, cacheKey});
    map = await JIMP.read(data);
}

/**
 * Parse a hurricane plot.
 * @param {String} data nexrad data from downloader.
 * @returns {Object} a canvas object of nexrad plot.
 */
NexradRadar._parseNexrad = async function(data) {
    const tmp = new Level2Radar(data);
    const nexradPlot = plot(tmp, 'REF', {background: 'white'}).REF.canvas;
    return (nexradPlot
        .getContext('2d')
        .getImageData(0, 0, NEXRAD_SIZE, NEXRAD_SIZE));
}

/**
 * Add a single hurricane plot onto the current google static map.
 * @param {String} radar name of NEXRAD radar.
 * @param {String} data  content of the NEXRAD file from downloader.
 */
NexradRadar._addHurricane = async function(radar, data) {
    let latCen = RADAR_LOCATIONS[radar][0];
    let lngCen = RADAR_LOCATIONS[radar][1];
    let boundingBox = this._getBoundingBox(latCen, lngCen, RANGE);
    let xMin = this._pixelsAt(0, boundingBox.minLng, settings).x;
    let xMax = this._pixelsAt(0, boundingBox.maxLng, settings).x;
    let yMin = this._pixelsAt(boundingBox.minLat, 0, settings).y;
    let yMax = this._pixelsAt(boundingBox.maxLat, 0, settings).y;
    // plot nexrad first
    let nexradPlot = await this._parseNexrad(data);
    let plot = await JIMP.read(nexradPlot);
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

/**
 * Draw the final plot.
 * @param {Object} imageData Data of the image
 * return {Image} the displayed image
 */
 NexradRadar._draw = async function(imageData) {
    const imageBuffer = await new Promise((resolve, reject) => {
        imageData.quality(100).getBuffer(JIMP.MIME_JPEG, (err, buffer) => {
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
 * @param {String} type Map type
 */
 NexradRadar._plotMap = async function(latitude, longitude, width, height, zoom, type) {
    this._configureMap(latitude, longitude, width, height, zoom, type);
    await this._addMap();
};

/**
 * Get a map image of the given region.
 * @param {Latitude} latitude Latitude of center point
 * @param {Longitude} longitude Longitude of center point
 * @param {BoundedInteger<1>} width Image width
 * @param {BoundedInteger<1>} height Image height
 * @param {BoundedInteger<1,25>} zoom Zoom level of map image
 * @param {String} type Type of the map
 */
 NexradRadar._plotMapWrapper = async function(latitude, longitude, width, height, zoom, type) {
    await this._plotMap(latitude, longitude, width, height, zoom, type);
    await this._draw(map);
    this._clear();
};

/**
 * Draw multiple hurricane plots onto the current map.
 * @param {Latitude} latitude Latitude of center point
 * @param {Longitude} longitude Longitude of center point
 * @param {BoundedInteger<1>} width Image width
 * @param {BoundedInteger<1>} height Image height
 * @param {BoundedInteger<1,25>} zoom Zoom level of map image
 * @param {String} type Type of the map
 * @param {Array<String>} radars Array of Radars.
 */
 NexradRadar._plotCompositeWrapper = async function(latitude, longitude, width, height, zoom, type, radars) {
    await this._plotMap(latitude, longitude, width, height, zoom, type);
    await this._plotRadars(latitude, longitude, width, height, zoom, radars);
    await map.composite(radarPlot, 0, 0);
    await this._draw(map);
    this._clear();
}

/**
 * Draw multiple hurricane plots.
 * @param {Latitude} latitude Latitude of center point
 * @param {Longitude} longitude Longitude of center point
 * @param {BoundedInteger<1>} width Image width
 * @param {BoundedInteger<1>} height Image height
 * @param {BoundedInteger<1,25>} zoom Zoom level of map image
 * @param {Array<String>} radars Array of Radars.
 */
 NexradRadar._plotRadars = async function(latitude, longitude, width, height, zoom, radars) {
    this._configureMap(latitude, longitude, width, height, zoom, "terrain");
    radarPlot = await new JIMP(settings.width, settings.height, 0x0);
    if(radars.length === 0) {
        await this._draw(radarPlot);
        return;
    }
    await this._downloadNexrads(radars);
    for(let i = 0; i < nexrad.length; ++i) {
        await this._addHurricane(nexrad[i][0], nexrad[i][1]);
    }
}

/**
 * Draw all composites on a road map.
 * @param {Latitude} latitude Latitude of center point
 * @param {Longitude} longitude Longitude of center point
 * @param {BoundedInteger<1>} width Image width
 * @param {BoundedInteger<1>} height Image height
 * @param {BoundedInteger<1,25>} zoom Zoom level of map image
 * @param {String} type Type of the map
 */
 NexradRadar._plotAllCompositesWrapper = async function(latitude, longitude, width, height, zoom, type) {
    let arr = await this.listRadars(latitude, longitude, width, height, zoom);
    let tmp = [];
    for(let i in arr) {
        tmp.push(arr[i][0]);
    }
    await this._plotCompositeWrapper(latitude, longitude, width, height, zoom, type, tmp);
}

NexradRadar._clear = function() {
    settings = {};
    map = null;
    nexrad = [];
    radarPlot = null;
}

/**
 * Get a road map image of the given region.
 * @param {Latitude} latitude Latitude of center point
 * @param {Longitude} longitude Longitude of center point
 * @param {BoundedInteger<1>} width Image width
 * @param {BoundedInteger<1>} height Image height
 * @param {BoundedInteger<1,25>} zoom Zoom level of map image
 */
NexradRadar.plotMapRoad = async function(latitude, longitude, width, height, zoom) {
    await this._plotMapWrapper(latitude, longitude, width, height, zoom, "road");
};

/**
 * Get a terrain map image of the given region.
 * @param {Latitude} latitude Latitude of center point
 * @param {Longitude} longitude Longitude of center point
 * @param {BoundedInteger<1>} width Image width
 * @param {BoundedInteger<1>} height Image height
 * @param {BoundedInteger<1,25>} zoom Zoom level of map image
 */
 NexradRadar.plotMapTerrain = async function(latitude, longitude, width, height, zoom) {
    await this._plotMapWrapper(latitude, longitude, width, height, zoom, "terrain");
};

/**
 * Get a satellite map image of the given region.
 * @param {Latitude} latitude Latitude of center point
 * @param {Longitude} longitude Longitude of center point
 * @param {BoundedInteger<1>} width Image width
 * @param {BoundedInteger<1>} height Image height
 * @param {BoundedInteger<1,25>} zoom Zoom level of map image
 */
 NexradRadar.plotMapSatellite = async function(latitude, longitude, width, height, zoom) {
    await this._plotMapWrapper(latitude, longitude, width, height, zoom, "satellite");
};

/**
 * List all radars within the range of the current map.
 * @param {Latitude} latitude Latitude of center point
 * @param {Longitude} longitude Longitude of center point
 * @param {BoundedInteger<1>} width Image width
 * @param {BoundedInteger<1>} height Image height
 * @param {BoundedInteger<1,25>} zoom Zoom level of map image
 * @returns {Array<Array<String>>} an array of radars
 */
NexradRadar.listRadars = function(latitude, longitude, width, height, zoom) {
    this._configureMap(latitude, longitude, width, height, zoom, "terrain");
    let latMin = this._coordsAt(0, settings.height / -2, settings).lat;
    let latMax = this._coordsAt(0, settings.height, settings).lat;
    let lngMin = this._coordsAt(settings.width / -2, 0, settings).lon;
    let lngMax = this._coordsAt(settings.width / 2, 0, settings).lon;
    let res = [["stationName", "latitude", "longitude"]];
    for(let i in RADAR_LOCATIONS) {
        if(RADAR_LOCATIONS[i][0] > latMin
            && RADAR_LOCATIONS[i][0] < latMax
            && RADAR_LOCATIONS[i][1] > lngMin
            && RADAR_LOCATIONS[i][1] < lngMax) {
            let tmp = [i, RADAR_LOCATIONS[i][0].toString(), RADAR_LOCATIONS[i][1].toString()];
            res.push(tmp);
        }
    }
    this._clear();
    return res;
}

/**
 * Draw multiple hurricane plots onto the current road map.
 * @param {Latitude} latitude Latitude of center point
 * @param {Longitude} longitude Longitude of center point
 * @param {BoundedInteger<1>} width Image width
 * @param {BoundedInteger<1>} height Image height
 * @param {BoundedInteger<1,25>} zoom Zoom level of map image
 * @param {Array<String>} radars Array of Radars.
 */
NexradRadar.plotCompositeRoad = async function(latitude, longitude, width, height, zoom, radars) {
    await this._plotCompositeWrapper(latitude, longitude, width, height, zoom, "roadmap", radars);
}

/**
 * Draw multiple hurricane plots onto the current terrain map.
 * @param {Latitude} latitude Latitude of center point
 * @param {Longitude} longitude Longitude of center point
 * @param {BoundedInteger<1>} width Image width
 * @param {BoundedInteger<1>} height Image height
 * @param {BoundedInteger<1,25>} zoom Zoom level of map image
 * @param {Array<String>} radars Array of Radars.
 */
 NexradRadar.plotCompositeTerrain = async function(latitude, longitude, width, height, zoom, radars) {
    await this._plotCompositeWrapper(latitude, longitude, width, height, zoom, "terrain", radars);
}

/**
 * Draw multiple hurricane plots onto the current satellite map.
 * @param {Latitude} latitude Latitude of center point
 * @param {Longitude} longitude Longitude of center point
 * @param {BoundedInteger<1>} width Image width
 * @param {BoundedInteger<1>} height Image height
 * @param {BoundedInteger<1,25>} zoom Zoom level of map image
 * @param {Array<String>} radars Array of Radars.
 */
 NexradRadar.plotCompositeSatellite = async function(latitude, longitude, width, height, zoom, radars) {
    await this._plotCompositeWrapper(latitude, longitude, width, height, zoom, "satellite", radars);
}

/**
 * Draw multiple hurricane plots.
 * @param {Latitude} latitude Latitude of center point
 * @param {Longitude} longitude Longitude of center point
 * @param {BoundedInteger<1>} width Image width
 * @param {BoundedInteger<1>} height Image height
 * @param {BoundedInteger<1,25>} zoom Zoom level of map image
 * @param {Array<String>} radars Array of Radars.
 */
NexradRadar.plotRadars = async function(latitude, longitude, width, height, zoom, radars) {
    await this._plotRadars(latitude, longitude, width, height, zoom, radars);
    await this._draw(radarPlot);
    this._clear();
}

/**
 * Draw all hurricane plots on a road map.
 * @param {Latitude} latitude Latitude of center point
 * @param {Longitude} longitude Longitude of center point
 * @param {BoundedInteger<1>} width Image width
 * @param {BoundedInteger<1>} height Image height
 * @param {BoundedInteger<1,25>} zoom Zoom level of map image
 */
NexradRadar.plotAllRadars = async function(latitude, longitude, width, height, zoom) {
    let arr = await this.listRadars(latitude, longitude, width, height, zoom);
    let tmp = [];
    for(let i in arr) {
        tmp.push(arr[i][0]);
    }
    await this.plotRadars(latitude, longitude, width, height, zoom, tmp);
}

/**
 * Draw all composites on a road map.
 * @param {Latitude} latitude Latitude of center point
 * @param {Longitude} longitude Longitude of center point
 * @param {BoundedInteger<1>} width Image width
 * @param {BoundedInteger<1>} height Image height
 * @param {BoundedInteger<1,25>} zoom Zoom level of map image
 */
NexradRadar.plotAllCompositesRoad = async function(latitude, longitude, width, height, zoom) {
    await this._plotAllCompositesWrapper(latitude, longitude, width, height, zoom, "roadmap");
}

/**
 * Draw all composites on a terrain map.
 * @param {Latitude} latitude Latitude of center point
 * @param {Longitude} longitude Longitude of center point
 * @param {BoundedInteger<1>} width Image width
 * @param {BoundedInteger<1>} height Image height
 * @param {BoundedInteger<1,25>} zoom Zoom level of map image
 */
 NexradRadar.plotAllCompositesTerrain = async function(latitude, longitude, width, height, zoom) {
    await this._plotAllCompositesWrapper(latitude, longitude, width, height, zoom, "terrain");
}

/**
 * Draw all composites on a satellite map.
 * @param {Latitude} latitude Latitude of center point
 * @param {Longitude} longitude Longitude of center point
 * @param {BoundedInteger<1>} width Image width
 * @param {BoundedInteger<1>} height Image height
 * @param {BoundedInteger<1,25>} zoom Zoom level of map image
 */
 NexradRadar.plotAllCompositesSatellite = async function(latitude, longitude, width, height, zoom) {
    await this._plotAllCompositesWrapper(latitude, longitude, width, height, zoom, "satellite");
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

/**
 * The Eclipse2017 Service provides access to US weather data along the path of the Great American Eclipse.
 * For more information about the eclipse, check out https://www.greatamericaneclipse.com/.
 * @service
 * @category Science
 */

const Eclipse2017 = {};
const logger = require('../utils/logger')('eclipse-2017');
const eclipsePathCenter = require('../../../utils/eclipse-2017/eclipsePath.js').center,
    rpcUtils = require('../utils'),
    stationUtils = require('./stations.js'),
    schedule = require('node-schedule'),
    { cronString } = require('./utils'),
    rpcStorage = require('../../storage');

var readingsCol,
    stationsCol,
    latestReadings = {};

// how often are we polling  wu servers?
const updateInterval = parseInt(process.env.WU_UPDATE_INTERVAL); // in seconds

/**
 * Get the path of the eclipse as a list of latitude, longitude, and time.
 */
Eclipse2017.eclipsePath = function(){
    return eclipsePathCenter();
};

let getStationsCol = () => {
    if (!stationsCol) {
        stationsCol = rpcStorage.create('wu:stations').collection;
    }
    return stationsCol;
};

let getReadingsCol = () => {
    if (!readingsCol) {
        readingsCol = rpcStorage.create('wu:readings').collection;
    }
    return readingsCol;
};

function hideDBAttrs(station){
    //cleanup stations
    delete station._id;
    delete station.coordinates;
    return station;
}

// if find the latest update before a point in time
Eclipse2017._stationReading = function(id, time) {
    if (!time && latestReadings[id]) return Promise.resolve(latestReadings[id]);
    // NOTE: it finds the latest available update on the database ( could be old if there is no new record!)
    let query = {pws: id};
    if(time) query.readAt = {$lte: new Date(time)};
    return getReadingsCol().find(query).sort({readAt:-1, requestTime: -1}).limit(1).toArray().then(readings => {
        let [ reading ] = readings;
        return reading;
    });
};

// find a range of readings (by time)
Eclipse2017._stationReadings = function (id, startTime, endTime) {
    let query = {pws: id};
    if (startTime || endTime) query.readAt = {};
    if (startTime){
        startTime = new Date(startTime);
        query.readAt.$gte = startTime;
    }
    if (endTime){
        endTime = new Date(endTime);
        query.readAt.$lte = endTime;
    }
    return getReadingsCol().find(query).sort({readAt: -1, requestTime: -1}).limit(1000).toArray()
        .then(readings => {
            logger.info(`found ${readings.length} readings for station ${id}`);
            return readings;
        });
};

// eager loading?
function loadLatestUpdates(numUpdates){
    getReadingsCol().find().sort({requestTime: -1}).limit(numUpdates).toArray().then(readings => {
        latestReadings = {};
        readings.forEach(reading => {
            if (!latestReadings[reading.pws] || (latestReadings[reading.pws].readAt <= reading.readAt && latestReadings[reading.pws].requestTime < reading.requestTime) ) latestReadings[reading.pws] = reading;
        });
        logger.trace('preloaded latest updates');
    });
}

// lacking a databasetrigger we load the latest updates every n seconds
// setInterval(loadLatestUpdates, 5000, 200);
// setup the scheduler so that it runs immediately after and update is pulled from the server
schedule.scheduleJob(cronString(updateInterval, 10),()=>loadLatestUpdates(200));

let availableStationsJson = function(maxReadingMedian, maxDistanceFromCenter, latitude, longitude, maxDistanceFromPoint){
    maxReadingMedian = parseInt(maxReadingMedian) || 120;
    maxDistanceFromCenter = parseInt(maxDistanceFromCenter) || 50;
    if (maxDistanceFromPoint) maxDistanceFromPoint = maxDistanceFromPoint * 1000;

    let query = {readingMedian: {$ne:null, $lte: maxReadingMedian}, distance: {$lte: maxDistanceFromCenter}};
    if (latitude && longitude) query.coordinates = { $nearSphere: { $geometry: { type: 'Point', coordinates: [longitude, latitude] }, $maxDistance: maxDistanceFromPoint } };
    return getStationsCol().find(query).toArray().then(stations => {
        return stations;
    });
};

/**
 * Get a list of reporting weather stations for the given arguments.
 *
 * @param {Number} maxReadingMedian
 * @param {Number} maxDistanceFromCenter
 * @param {Latitude=} latitude
 * @param {Longitude=} longitude
 * @param {Number=} maxDistanceFromPoint
 */
Eclipse2017.availableStations = function(maxReadingMedian, maxDistanceFromCenter, latitude, longitude, maxDistanceFromPoint){
    return availableStationsJson(maxReadingMedian, maxDistanceFromCenter, latitude, longitude, maxDistanceFromPoint)
        .then(stations => rpcUtils.jsonToSnapList(stations));
};


/**
 * Get a list of reporting stations IDs (pws field).
 */
Eclipse2017.stations = function() {
    return stationUtils.selected().then(stations => stations.map(station => station.pws));
};

/**
 * Get information about a given reporting station.
 *
 * @param {String} stationId Reporting station ID (pws)
 */
Eclipse2017.stationInfo = function(stationId) {
    return getStationsCol().findOne({pws: stationId})
        .then(station => {
            return rpcUtils.jsonToSnapList(hideDBAttrs(station));
        });
};

/**
 * Get the latest temperature for a given weather station.
 *
 * @param {String} stationId
 */
Eclipse2017.temperature = function(stationId){
    return Eclipse2017._stationReading(stationId).then(reading => {
        return reading.temp;
    });
};


/**
 * Get historical temperature for a given weather station.
 *
 * @param {String} stationId
 * @param {String} time
 */
Eclipse2017.pastTemperature = function(stationId, time){
    return Eclipse2017._stationReading(stationId, time).then(reading => {
        return reading.temp;
    });
};

/**
 * Get the latest conditions at a given weather station.
 *
 * @param {String} stationId
 */
Eclipse2017.condition = function(stationId){
    return Eclipse2017._stationReading(stationId).then(reading => {
        return rpcUtils.jsonToSnapList(hideDBAttrs(reading));
    });
};


/**
 * Get historical conditions at a given weather station.
 *
 * @param {String} stationId
 * @param {String} time
 */
Eclipse2017.pastCondition = function(stationId, time){
    return Eclipse2017._stationReading(stationId, time).then(reading => {
        return rpcUtils.jsonToSnapList(hideDBAttrs(reading));
    });
};

/**
 * Get the reported temperatures for a given weather station.
 *
 * @param {String} stationId
 * @param {String} limit Number of results to return (max is 3000)
 */
Eclipse2017.temperatureHistory = function(stationId, limit){
    limit = parseInt(limit);
    if (limit > 3000) limit = 3000;
    return getReadingsCol().find({pws: stationId}).sort({readAt: -1, requestTime: -1})
        .limit(limit).toArray().then(updates => {
            return updates.map(update => update.temp);
        });
};

/**
 * Get the reported conditions for a given weather station.
 *
 * @param {String} stationId
 * @param {String} limit Number of results to return (max is 3000)
 */
Eclipse2017.conditionHistory = function(stationId, limit){
    limit = parseInt(limit);
    if (limit > 3000) limit = 3000;
    return getReadingsCol().find({pws: stationId}).sort({readAt: -1, requestTime: -1})
        .limit(limit).toArray().then(updates => {
            return rpcUtils.jsonToSnapList(updates.map(update => hideDBAttrs(update)));
        });
};

/**
 * Get the reported temperatures during a given time for a given weather station.
 *
 * @param {String} stationId
 * @param {String} startTime
 * @param {String} endTime
 */
Eclipse2017.temperatureHistoryRange = function(stationId, startTime, endTime){
    return Eclipse2017._stationReadings(stationId, startTime, endTime).then(readings => {
        return readings.map(r => r.temp);
    });
};

/**
 * Get the reported conditions during a given time for a given weather station.
 *
 * @param {String} stationId
 * @param {String} startTime
 * @param {String} endTime
 */
Eclipse2017.conditionHistoryRange = function(stationId, startTime, endTime){
    return Eclipse2017._stationReadings(stationId, startTime, endTime).then(readings => {
        return rpcUtils.jsonToSnapList(readings);
    });
};

/**
 * Get information about all reporting weather stations.
 */
Eclipse2017.stationsInfo = function(){
    return stationUtils.selected().then(stations => rpcUtils.jsonToSnapList(stations.map(s => hideDBAttrs(s))));
};

/**
 * Divide the eclipse path into a number of sections and select weather stations from each section.
 *
 * @param {Integer} numSections Number of sections to divide the path into
 * @param {Integer} perSection Number of stations to select
 */
Eclipse2017.selectSectionBased = stationUtils.selectSectionBased;

/**
 * Get stations selected based on the points of the eclipse path.
 */
Eclipse2017.selectPointBased = stationUtils.selectPointBased;

Eclipse2017.COMPATIBILITY = {
    deprecatedMethods: ['temperature', 'condition']
};


module.exports = Eclipse2017;

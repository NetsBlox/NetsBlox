/**
 * The Eclipse2017 Service provides access to US weather data along the path of the Great American Eclipse.
 * For more information about the eclipse, check out https://www.greatamericaneclipse.com/.
 * @service
 * @category Science
 */

const logger = require('../utils/logger')('eclipse-2017');
const eclipsePathCenter = require('../../../../../utils/rpc/eclipse-2017/eclipsePath.js').center,
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

let eclipsePath = function(){
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
function _stationReading(id, time){
    if (!time && latestReadings[id]) return Promise.resolve(latestReadings[id]);
    // NOTE: it finds the latest available update on the database ( could be old if there is no new record!)
    let query = {pws: id};
    if(time) query.readAt = {$lte: new Date(time)};
    return getReadingsCol().find(query).sort({readAt:-1, requestTime: -1}).limit(1).toArray().then(readings => {
        let [ reading ] = readings;
        return reading;
    });
}

// find a range of readings (by time)
function _stationReadings(id, startTime, endTime){
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
}

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
    if (latitude) latitude = parseFloat(latitude);
    if (longitude) longitude = parseFloat(longitude);
    if (maxDistanceFromPoint) maxDistanceFromPoint = parseInt(maxDistanceFromPoint) * 1000;
    let query = {readingMedian: {$ne:null, $lte: maxReadingMedian}, distance: {$lte: maxDistanceFromCenter}};
    if (latitude && longitude) query.coordinates = { $nearSphere: { $geometry: { type: 'Point', coordinates: [longitude, latitude] }, $maxDistance: maxDistanceFromPoint } };
    return getStationsCol().find(query).toArray().then(stations => {
        return stations;
    });
};

let availableStations = function(maxReadingMedian, maxDistanceFromCenter, latitude, longitude, maxDistanceFromPoint){
    return availableStationsJson(maxReadingMedian, maxDistanceFromCenter, latitude, longitude, maxDistanceFromPoint)
        .then(stations => rpcUtils.jsonToSnapList(stations));
};


let stations = function(){
    return stationUtils.selected().then(stations => stations.map(station => station.pws));
};

let stationInfo = function(stationId){
    return getStationsCol().findOne({pws: stationId})
        .then(station => {
            return rpcUtils.jsonToSnapList(hideDBAttrs(station));
        });
};

let temperature = function(stationId){
    return _stationReading(stationId).then(reading => {
        return reading.temp;
    });
};


let pastTemperature = function(stationId, time){
    return _stationReading(stationId, time).then(reading => {
        return reading.temp;
    });
};


let condition = function(stationId){
    return _stationReading(stationId).then(reading => {
        return rpcUtils.jsonToSnapList(hideDBAttrs(reading));
    });
};


let pastCondition = function(stationId, time){
    return _stationReading(stationId, time).then(reading => {
        return rpcUtils.jsonToSnapList(hideDBAttrs(reading));
    });
};

let temperatureHistory = function(stationId, limit){
    limit = parseInt(limit);
    if (limit > 3000) limit = 3000;
    return getReadingsCol().find({pws: stationId}).sort({readAt: -1, requestTime: -1})
        .limit(limit).toArray().then(updates => {
            return updates.map(update => update.temp);
        });
};

let conditionHistory = function(stationId, limit){
    limit = parseInt(limit);
    if (limit > 3000) limit = 3000;
    return getReadingsCol().find({pws: stationId}).sort({readAt: -1, requestTime: -1})
        .limit(limit).toArray().then(updates => {
            return rpcUtils.jsonToSnapList(updates.map(update => hideDBAttrs(update)));
        });
};

let temperatureHistoryRange = function(stationId, startTime, endTime){
    return _stationReadings(stationId, startTime, endTime).then(readings => {
        return readings.map(r => r.temp);
    });
};

let conditionHistoryRange = function(stationId, startTime, endTime){
    return _stationReadings(stationId, startTime, endTime).then(readings => {
        return rpcUtils.jsonToSnapList(readings);
    });
};

let stationsInfo = function(){
    return stationUtils.selected().then(stations => rpcUtils.jsonToSnapList(stations.map(s => hideDBAttrs(s))));
};

module.exports = {
    stations,
    stationsInfo,
    stationInfo,
    eclipsePath,
    temperature,
    pastTemperature,
    temperatureHistory,
    condition,
    pastCondition,
    conditionHistory,
    temperatureHistoryRange,
    conditionHistoryRange,
    availableStations,
    _stationReading,
    _stationReadings,
    selectSectionBased: stationUtils.selectSectionBased,
    selectPointBased: stationUtils.selectPointBased,
    COMPATIBILITY: {
        deprecatedMethods: ['temperature', 'condition']
    }
};

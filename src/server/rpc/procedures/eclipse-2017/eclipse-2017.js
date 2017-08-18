const Logger = require('../../../logger'),
    eclipsePathCenter = require('../../../../../utils/rpc/eclipse-2017/eclipsePath.js').center,
    rpcUtils = require('../utils'),
    stationUtils = require('./stations.js'),
    logger = new Logger('netsblox:eclipse'),
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
    return station
}

// OPTIMIZE can be cached based on approximate coords n time
function closestReading(lat, lon, time){
    const MAX_DISTANCE = 25000, // in meters
        MAX_AGE = 60 * 5; // in seconds
    time = time ? new Date(time) : new Date();// should be in iso format or epoch if there is no time past it means we want the temp for now!
    stationUtils.nearbyStations(lat, lon, MAX_DISTANCE).then(stations => {
        let stationIds = stations.map(station => station.pws);
        // ask mongo for updates with the timelimit and specific stations.
        // QUESTION could lookup for a single stations instead here.. will lead to more calls to the database and more promises
        // either ask mongo for readings with {pws: closestStation, dateRange} or give it an array of stations
        let startTime = new Date(time);
        startTime.setSeconds(startTime.getSeconds() - MAX_AGE);
        let updatesQuery = {pws: { $in: stationIds }, readAt: {$gte: startTime, $lte: time}};
        logger.info('readings query',updatesQuery);
        return getReadingsCol().find(updatesQuery).sort({requestTime: -1, distance: 1}).toArray().then(readings => {
            // QUESTION pick the closest or latest?!
            // sth like pickBestStations but on readings
            logger.info('replying with ',readings);
            return readings[0];
        });
    });

} // end of closestReading

// if find the latest update before a point in time
function _stationReading(id, time){
    if (!time && latestReadings[id]) return Promise.resolve(latestReadings[id]);
    // NOTE: it finds the latest available update on the database ( could be old if there is no new record!)
    let query = {pws: id};
    if(time) query.readAt = {$lte: new Date(time)};
    return getReadingsCol().find(query).sort({requestTime: -1}).limit(1).toArray().then(readings => {
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
    return getReadingsCol().find(query).sort({requestTime: -1}).limit(1000).toArray()
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
            if (!latestReadings[reading.pws] || latestReadings[reading.pws].requestTime < reading.requestTime ) latestReadings[reading.pws] = reading;
        });
        logger.trace('preloaded latest updates');
    });
}

// lacking a databasetrigger we load the latest updates every n seconds
// setInterval(loadLatestUpdates, 5000, 200);
// setup the scheduler so that it runs immediately after and update is pulled from the server
schedule.scheduleJob(cronString(updateInterval, 10),()=>loadLatestUpdates(200));

// lookup temp based on location
let temp = function(latitude, longitude, time){
    return closestReading(latitude, longitude, time).then(reading => {
        return reading.temp;
    });
};


let currentCondition = function(latitude, longitude, time){
    return closestReading(latitude, longitude, time).then(reading => {
        return rpcUtils.jsonToSnapList(reading);
    });
};

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
    return getReadingsCol().find({pws: stationId}).sort({requestTime: -1})
        .limit(limit).toArray().then(updates => {
            return updates.map(update => update.temp);
        });
};

let conditionHistory = function(stationId, limit){
    limit = parseInt(limit);
    if (limit > 3000) limit = 3000;
    return getReadingsCol().find({pws: stationId}).sort({requestTime: -1})
        .limit(limit).toArray().then(updates => {
            return rpcUtils.jsonToSnapList(updates.map(update => hideDBAttrs(update)));
        });
};

let temperatureHistoryRange = function(stationId, startTime, endTime){
    return _stationReadings(stationId, startTime, endTime).then(readings => {
        return readings.map(r => r.temp);
    });
};

let stationsInfo = function(){
    return stationUtils.selected().then(stations => rpcUtils.jsonToSnapList(stations.map(s => hideDBAttrs(s))));
};

module.exports = {
    isStateless: true,
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
    availableStations,
    _stationReading,
    _stationReadings,
    selectSectionBased: stationUtils.selectSectionBased,
    selectPointBased: stationUtils.selectPointBased
};

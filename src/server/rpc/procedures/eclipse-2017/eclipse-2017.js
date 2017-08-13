const Storage = require('../../../storage/storage'),
    Logger = require('../../../logger'),
    eclipsePathCenter = require('../../../../../utils/rpc/eclipse-2017/eclipsePathCenter.js'),
    rpcUtils = require('../utils'),
    stationUtils = require('./stations.js'),
    logger = new Logger('netsblox:eclipse'),
    storage = new Storage(logger);

const STATIONS_COL = 'wuStations',
    READINGS_COL = 'wuReadings';
var connection,
    latestReadings = {};

let eclipsePath = function(){
    return eclipsePathCenter();
};

// connect to nb database
let dbConnect = () => {
    if (!connection) {
        connection = storage.connect();
    }
    // connection is a promise of db connection
    return connection;
};


// OPTIMIZE can be cached based on approximate coords n time
function closestReading(lat, lon, time){
    const MAX_DISTANCE = 25000, // in meters
        MAX_AGE = 60 * 5; // in seconds
    time = time ? new Date(time) : new Date();// should be in iso format or epoch if there is no time past it means we want the temp for now!

    return dbConnect().then(db => {
        stationUtils.nearbyStations(db, lat, lon, MAX_DISTANCE).then(stations => {
            let stationIds = stations.map(station => station.pws);
            // ask mongo for updates with the timelimit and specific stations.
            // QUESTION could lookup for a single stations instead here.. will lead to more calls to the database and more promises
            // either ask mongo for readings with {pws: closestStation, dateRange} or give it an array of stations
            let startTime = new Date(time);
            startTime.setSeconds(startTime.getSeconds() - MAX_AGE);
            let updatesQuery = {pws: { $in: stationIds }, readAt: {$gte: startTime, $lte: time}};
            logger.info('readings query',updatesQuery);
            return db.collection(READINGS_COL).find(updatesQuery).sort({readAt: -1, distance: 1}).toArray().then(readings => {
                // QUESTION pick the closest or latest?!
                // sth like pickBestStations but on readings
                logger.info('replying with ',readings);
                return readings[0];
            });
        });
    });

} // end of closestReading

function transformReading(update){
    update.id = update.pws;
    delete update._id;
    delete update.pws;
    return update;
}

// if find the latest update before a point in time
function stationReading(id, time){
    if (!time && latestReadings[id]) return Promise.resolve(latestReadings[id]);
    return dbConnect().then( db => {
        // NOTE: it finds the latest available update on the database ( could be old if there is no new record!)
        let query = {pws: id};
        if(time) query.readAt = {$lte: new Date(time)};
        return db.collection(READINGS_COL).find(query).sort({readAt: -1}).limit(1).toArray().then(readings => {
            let reading = readings[0];
            return reading;
        });
    });
}

// eager loading?
function loadLatestUpdates(numUpdates){
    dbConnect().then(db => {
        db.collection(READINGS_COL).find().sort({readAt: -1}).limit(numUpdates).toArray().then(readings => {
            latestReadings = {};
            readings.forEach(reading => {
                if (!latestReadings[reading.pws] || latestReadings[reading.pws].readAt < reading.readAt ) latestReadings[reading.pws] = reading;
            });
            logger.trace('preloaded latest updates');
        });
    });
}
// lacking a databasetrigger we load the latest updates every n seconds
setInterval(loadLatestUpdates, 5000, 200);

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
    return dbConnect().then(db => {
        return db.collection(STATIONS_COL).find(query).toArray().then(stations => {
            return stations;
        });
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
    return dbConnect().then(db => {
        return db.collection(STATIONS_COL).findOne({pws: stationId})
            .then(station => {
                return rpcUtils.jsonToSnapList(station);
            });
    });
};

let temperature = function(stationId){
    return stationReading(stationId).then(reading => {
        return reading.temp;
    });
};


let pastTemperature = function(stationId, time){
    return stationReading(stationId, time).then(reading => {
        return reading.temp;
    });
};


let condition = function(stationId){
    return stationReading(stationId).then(reading => {
        return rpcUtils.jsonToSnapList(reading);
    });
};


let pastCondition = function(stationId, time){
    return stationReading(stationId, time).then(reading => {
        return rpcUtils.jsonToSnapList(reading);
    });
};

let temperatureHistory = function(stationId, limit){
    return dbConnect().then(db => {
        return db.collection(READINGS_COL).find({pws: stationId}).sort({readAt: -1})
            .limit(parseInt(limit)).toArray().then(updates => {
                return updates.map(update => update.temp);
            });
    });
};

let conditionHistory = function(stationId, limit){
    return dbConnect().then(db => {
        return db.collection(READINGS_COL).find({pws: stationId}).sort({readAt: -1})
            .limit(parseInt(limit)).toArray().then(updates => {
                return rpcUtils.jsonToSnapList(updates);
            });
    });
};

// TODO add arg validation like openWeather

module.exports = {
    isStateless: true,
    stations,
    stationInfo,
    eclipsePath,
    temperature,
    pastTemperature,
    temperatureHistory,
    condition,
    pastCondition,
    conditionHistory,
    availableStations,
    selectedStationsJson: stationUtils.selected,
    selectSectionBased: stationUtils.selectSectionBased,
    selectPointBased: stationUtils.selectPointBased,
    availableStationsJson
};

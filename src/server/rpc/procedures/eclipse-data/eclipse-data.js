const Storage = require('../../../storage/storage'),
    Logger = require('../../../logger'),
    rpcUtils = require('../utils'),
    logger = new Logger('netsblox:eclipse'),
    storage = new Storage(logger);

const STATIONS_COL = 'wuStations',
    READINGS_COL = 'wuReadings';
let connection;

// connect to nb database
let dbConnect = () => {
    const mongoUri = process.env.MONGO_URI || process.env.MONGOLAB_URI || 'mongodb://localhost:27017/admin';
    if (!connection) {
        connection = storage.connect(mongoUri);
    }
    return connection;
};


// OPTIMIZE can be cached based on approximate coords n time
function closestReading(lat, lon, time){
    const MAX_DISTANCE = 10000, // in meters
        MAX_AGE = 60 * 5;

    time = new Date(time);

    // TODO find stations within MAX_DISTANCE
    let query = { coordinates: { $nearSphere: { $geometry: { type: "Point", coordinates: [longitude, latitude] }, $maxDistance: MAX_DISTANCE } } };

    // TODO ask mongo for updates with the timelimit and specific stations.
    let startTime = time;
    startTime.setSeconds(startTime.getSeconds() - MAX_AGE);
    query.readAt = {$gte: startTime, $lte: time}

    // either ask mongo for readings with {pws: closestStation, dateRange} or give it an array of stations
    console.log('query', query);
    // readingsCol.find(query); // can be sorted by distance or time .?

    return dbConnect().then(db => {
        let readingsCol = db.collection(READINGS_COL);
        return readingsCol.findOne();
    })
}

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



// TODO add arg validation like openWeather



module.exports = {
    isStateless: true,
    temp,
    currentCondition
};

const Storage = require('../../../storage/storage'),
    Logger = require('../../../logger'),
    rpcUtils = require('../utils'),
    logger = new Logger('netsblox:eclipse'),
    storage = new Storage(logger);

const STATIONS_COL = 'wuStations',
    READINGS_COL = 'wuReadings';
let connection;

// TODO a service to return timezones based on location

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
    const MAX_DISTANCE = 50000, // in meters
        MAX_AGE = 60 * 500;

    time = new Date(time);
    lat = parseFloat(lat);
    lon = parseFloat(lon);

    return dbConnect().then(db => {
        // find stations within MAX_DISTANCE
        let closeStations = { coordinates: { $nearSphere: { $geometry: { type: "Point", coordinates: [lon, lat] }, $maxDistance: MAX_DISTANCE } } };
        return db.collection(STATIONS_COL).find(closeStations).toArray().then(stations => {
            // sorted array of stations by closest first
            let stationIds = stations.map(station => station.pws);
            // ask mongo for updates with the timelimit and specific stations.
            // QUESTION could lookup for a single stations instead here.. will lead to more calls to the database and more promises
            // either ask mongo for readings with {pws: closestStation, dateRange} or give it an array of stations
            // TODO timezone problems, when saving and converting dates. here and also where you are saving em to database for the first time
            let startTime = new Date(time);
            startTime.setSeconds(startTime.getSeconds() - MAX_AGE);
            let updatesQuery = {pws: { $in: stationIds }, readAt: {$gte: startTime, $lte: time}};
            console.log('readings query',updatesQuery);
            return db.collection(READINGS_COL).find(updatesQuery).toArray().then(readings => {
                // TODO pick the reading with closest location out of these available readings
                console.log('replying with ',readings);
                return readings[0];
            });
        });
    });

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

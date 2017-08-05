const Storage = require('../../../storage/storage'),
    Logger = require('../../../logger'),
    eclipsePathCenter = require('../../../../../utils/rpc/eclipse-2017/eclipsePathCenter.js'),
    rpcUtils = require('../utils'),
    { sectionStations, pickBestStations } = require('../../../../../utils/rpc/eclipse-2017/checkStations.js'),
    logger = new Logger('netsblox:eclipse'),
    storage = new Storage(logger);

const STATIONS_COL = 'wuStations',
    READINGS_COL = 'wuReadings';
let connection;

// connect to nb database
let dbConnect = () => {
    const mongoUri = process.env.MONGO_URI || process.env.MONGOLAB_URI || 'mongodb://localhost:27017';
    if (!connection) {
        connection = storage.connect(mongoUri);
    }
    return connection;
};

// OPTIMIZE can be cached based on approximate coords n time
function closestReading(lat, lon, time){
    const MAX_DISTANCE = 25000, // in meters
        MAX_AGE = 60 * 5; // in seconds

    time = new Date(time); // should be in iso format or epoch
    lat = parseFloat(lat);
    lon = parseFloat(lon);

    return dbConnect().then(db => {
        // find stations uptodate stations within MAX_DISTANCE
        let closeStations = { coordinates: { $nearSphere: { $geometry: { type: "Point", coordinates: [lon, lat] }, $maxDistance: MAX_DISTANCE } } };
        closeStations.readingAvg = {$ne: null, $lte: MAX_AGE*10};
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

} // end of closestReading

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


let availableStations = function(maxReadingAvg, maxDistanceFromCenter, latitude, longitude, maxDistanceFromPoint){
    maxReadingAvg = parseInt(maxReadingAvg) || 120;
    maxDistanceFromCenter = parseInt(maxDistanceFromCenter) || 50;
    if (latitude) latitude = parseFloat(latitude);
    if (longitude) longitude = parseFloat(longitude);
    if (maxDistanceFromPoint) maxDistanceFromPoint = parseInt(maxDistanceFromPoint) * 1000;
    let query = {readingAvg: {$ne:null, $lte: maxReadingAvg}, distance: {$lte: maxDistanceFromCenter}};
    if (latitude && longitude) query.coordinates = { $nearSphere: { $geometry: { type: "Point", coordinates: [longitude, latitude] }, $maxDistance: maxDistanceFromPoint } };
    return dbConnect().then(db => {
        return db.collection(STATIONS_COL).find(query).toArray().then(stations => {
            return rpcUtils.jsonToSnapList(stations);
        });
    });
};

let selectedStations = function(numSections, perSection){
    numSections = parseInt(numSections);
    perSection = parseInt(perSection);
    console.log(sectionStations)
    return sectionStations(numSections).then(sections => {
        sections = sections.map(stations => pickBestStations(stations, perSection));
        sections.forEach(section => {
            process.stdout.write(section.length+'');
        })
        let stations = sections.reduce((arr,val)=> arr.concat(val));
        return rpcUtils.jsonToSnapList(stations);
    });
}


let eclipsePath = function(){
    return eclipsePathCenter();
};

// TODO add arg validation like openWeather

module.exports = {
    isStateless: true,
    temp,
    currentCondition,
    eclipsePath,
    availableStations,
    selectedStations
};

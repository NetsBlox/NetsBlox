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

let eclipsePath = function(){
    return eclipsePathCenter();
};

// connect to nb database
let dbConnect = () => {
    const mongoUri = process.env.MONGO_URI || process.env.MONGOLAB_URI || 'mongodb://localhost:27017';
    if (!connection) {
        connection = storage.connect(mongoUri);
    }
    return connection;
};

function nearbyStations(db, lat, lon,  maxDistance){
    lat = parseFloat(lat);
    lon = parseFloat(lon);
    // find stations uptodate stations within MAX_DISTANCE
    let closeStations = { coordinates: { $nearSphere: { $geometry: { type: "Point", coordinates: [lon, lat] }, $maxDistance: maxDistance } } };
    closeStations.readingMedian = {$ne: null, $lte: 1800}; // lte: just to avoid getting slow stations
    return db.collection(STATIONS_COL).find(closeStations).sort({readingMedian: 1}).toArray().then(stations => {
        // sorted array of stations by closest first
        console.log(`found ${stations.length} stations within ${maxDistance/1000} of ${lat}, ${lon}`);
        return stations
    });
} // end of nearbyStations

// OPTIMIZE can be cached based on approximate coords n time
function closestReading(lat, lon, time){
    const MAX_DISTANCE = 25000, // in meters
        MAX_AGE = 60 * 5; // in seconds
    time = time ? new Date(time) : new Date();// should be in iso format or epoch if there is no time past it means we want the temp for now! 

    return dbConnect().then(db => {
        nearbyStations(db, lat, lon, MAX_DISTANCE).then(stations => {
            let stationIds = stations.map(station => station.pws);
            // ask mongo for updates with the timelimit and specific stations.
            // QUESTION could lookup for a single stations instead here.. will lead to more calls to the database and more promises
            // either ask mongo for readings with {pws: closestStation, dateRange} or give it an array of stations
            // TODO timezone problems, when saving and converting dates. here and also where you are saving em to database for the first time
            let startTime = new Date(time);
            startTime.setSeconds(startTime.getSeconds() - MAX_AGE);
            let updatesQuery = {pws: { $in: stationIds }, readAt: {$gte: startTime, $lte: time}};
            console.log('readings query',updatesQuery);
            return db.collection(READINGS_COL).find(updatesQuery).sort({readAt: -1, distance: 1}).toArray().then(readings => {
                // QUESTION pick the closest or latest?!
                // sth like pickBestStations but on readings
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


let availableStations = function(maxReadingMedian, maxDistanceFromCenter, latitude, longitude, maxDistanceFromPoint){
    maxReadingMedian = parseInt(maxReadingMedian) || 120;
    maxDistanceFromCenter = parseInt(maxDistanceFromCenter) || 50;
    if (latitude) latitude = parseFloat(latitude);
    if (longitude) longitude = parseFloat(longitude);
    if (maxDistanceFromPoint) maxDistanceFromPoint = parseInt(maxDistanceFromPoint) * 1000;
    let query = {readingMedian: {$ne:null, $lte: maxReadingMedian}, distance: {$lte: maxDistanceFromCenter}};
    if (latitude && longitude) query.coordinates = { $nearSphere: { $geometry: { type: "Point", coordinates: [longitude, latitude] }, $maxDistance: maxDistanceFromPoint } };
    return dbConnect().then(db => {
        return db.collection(STATIONS_COL).find(query).toArray().then(stations => {
            return rpcUtils.jsonToSnapList(stations);
        });
    });
};

let selectSectionBased = function(numSections, perSection){
    numSections = parseInt(numSections);
    perSection = parseInt(perSection);
    console.log(sectionStations)
    return sectionStations(numSections).then(sections => {
        sections = sections.map(stations => pickBestStations(stations, perSection));
        sections.forEach(section => {
            process.stdout.write(section.length+'');
        })
        let stations = sections.reduce((arr,val)=> arr.concat(val));
        return stations;
    });
}

let selectPointBased = function(){
    return dbConnect().then(db => {
        let pointToStation = point => {
            return nearbyStations(db, point[0], point[1], 25000 )
                .then(stations => {
                    return pickBestStations(stations,1)[0];
                }).catch(console.log);
        };
        // TODO generate more points
        let stationPromises = eclipsePathCenter().map(pointToStation);
        console.log(stationPromises)
        return Promise.all(stationPromises).then(stations => {
            console.log(stations)
            return stations;
        });
    })
}

let selectedStations = function(numSections, perSection){
    return selectSectionBased(numSections, perSection).then(stations => {
        return rpcUtils.jsonToSnapList(stations);
    })
}


let selectedStations2 = function(){
    return selectPointBased().then(stations => {
        return rpcUtils.jsonToSnapList(stations);
    })
}

// TODO add arg validation like openWeather

module.exports = {
    isStateless: true,
    temp,
    currentCondition,
    eclipsePath,
    availableStations,
    selectedStations,
    selectedStations2,
    selectSectionBased,
    selectPointBased
};

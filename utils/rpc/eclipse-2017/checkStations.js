const fs = require('fs'),
    geolib = require('geolib'),
    request = require('request'),
    rp = require('request-promise'),
    Q = require('q'),
    _ = require('lodash'),
    eclipsePath = require('./eclipsePathCenter'),
    stationUtils = require('../../../src/server/rpc/procedures/eclipse-2017/stations.js'),
    csv = require('fast-csv'),
    Storage = require('../../../src/server/storage/storage'),
    Logger = require('../../../src/server/logger'),
    logger = new Logger('netsblox:wu'),
    storage = new Storage(logger);

const STATIONS_COL = 'wuStations',
    READINGS_COL = 'wuReadings';
const WU_KEY = process.env.WEATHER_UNDERGROUND_KEY,
    INTERVAL = 61 * 1000, //in msec
    API_LIMIT = 900; //per min

// parameters to config:
// 1. in fireUpdates: config available stations to poll, considering number of updates

let connection;

// connect to nb database
let dbConnect = () => {
    if (!connection) {
        connection = storage.connect();
    }
    // connection is a promise of db connection
    return connection;
};


function loadStations(fileName){
    let stations = [];
    let deferred = Q.defer();
    let stream = fs.createReadStream(fileName);
    var csvStream = csv
        .parse({headers:true, objectMode:true})
        .on("data", function(data){
            data.latitude = parseFloat(data.latitude);
            data.longitude = parseFloat(data.longitude);
            data.distance = parseFloat(data.distance);
            data.views = parseInt(data.views);
            data.elevation = parseInt(data.elevation);
            delete data.updatedAt;
            stations.push(data);
        })
        .on("end", function(){
            logger.info("done loading stations");
            deferred.resolve(stations);
        });

    stream.pipe(csvStream);
    return deferred.promise;
}


// gets a list of station ids
function reqUpdates(stations){
    if (stations[0] && stations[0].pws) stations = stations.map(item => item.pws);
    let promises = [];
    let deferred = Q.defer();
    let rounds = Math.ceil(stations.length / API_LIMIT);
    let callsPerRound = Math.ceil(stations.length/rounds);
    // every minute query up to callsPerRound stations
    let stationChunks = _.chunk(stations, callsPerRound);
    let fire = () => {
        let ids = stationChunks.shift();
        logger.info(`getting updates from ${ids.length} stations ids`, ids.join());
        promises = promises.concat(ids.map(reqUpdate));
        if (stationChunks.length > 0) {
            setTimeout(fire, INTERVAL);
        }else {
            Q.allSettled(promises).done(responses => {
                responses = responses.filter(item => {
                    if (item.state === 'rejected') {
                        logger.info('failed', item.reason);
                        return false;
                    }
                    return true;
                });
                let stationsArr = responses.map(item => item.value);
                deferred.resolve(stationsArr);
            });
        }
    };
    fire();
    return deferred.promise;
}


// loads the stations collection for the first time
let seedDB = (fileName) => {
    loadStations(fileName).then(stations => {
        return dbConnect().then(db => {
            logger.info('connected to db');
            // create index on pws instead of _id ? // TODO remove id index?! or use it
            db.collection(READINGS_COL).createIndex({coordinates: "2dsphere"}); // this is not needed if we are not going to lookup reading based on lat lon
            db.collection(STATIONS_COL).createIndex({coordinates: "2dsphere"});
            db.collection(READINGS_COL).createIndex({pws: 1});
            db.collection(READINGS_COL).createIndex({readAt: -1});
            stations = stations.map(station => {
                station.coordinates = [station.longitude, station.latitude];
                return station;
            });
            let stationsCol = db.collection(STATIONS_COL);
            stationsCol.insertMany(stations);
        });
    });
};

// given enough readings in the readigsCollection calculates the average reading age for stations
// not returning proper promise
let calcStationStats = () => {
    return dbConnect().then(db => {
        let stationsCol = db.collection(STATIONS_COL);
        let readingsCol = db.collection(READINGS_COL);
        let aggregateQuery = {
            $group: {
                _id: {pws: "$pws"},
                count: {$sum: 1},
                readingAvg: {$avg: "$lastReadingAge"},
                docs: {$push: "$_id"}
            }
        };
        logger.info(aggregateQuery);
        return readingsCol.aggregate([aggregateQuery]).toArray().then(updates => {
            logger.info('this many aggregated results', updates.length);
            // TODO there must be a better way to update em at once instead of doing separate queries!
            // or load it all in the RAM 
            let operationsPromise = [];
            updates.forEach(update => {
                let query = {pws: update._id.pws};
                // this is the most time consuming part. 
                let opPromise = readingsCol.find(query).sort( {lastReadingAge:1} ).skip(update.count / 2 - 1).limit(1).toArray()
                    .then(readings => {
                        let median = readings[0].lastReadingAge;
                        // could also do trimmed median? 
                        let updateObj = {$set: {readingAvg: update.readingAvg, updates: update.count, readingMedian: median}};
                        let updateOne = {updateOne: {
                            filter: query,
                            update: updateObj,
                            upsert: false
                        }};
                        return updateOne;
                    });
                operationsPromise.push(opPromise);
            });
            return Promise.all(operationsPromise);
        }).then(operations => {
            logger.info('operations', operations);
            return db.collection(STATIONS_COL).bulkWrite(operations);
        }).catch(logger.info);
    });
};

function calcDistance(){
    dbConnect().then(db => {
        db.collection(STATIONS_COL).find().toArray().then(stations => {
            //calculate the distance and update in the db 
            let operations = [];
            stations.forEach(station => {
                let updateOne = {updateOne: {
                    filter: {pws: station.pws},
                    update: {$set: {distance: distanceToPath(station.latitude, station.longitude)} },
                    upsert: false
                }};
                operations.push(updateOne);
            });
            db.collection(STATIONS_COL).bulkWrite(operations);
        });
    });
} // end of calcDistance


let contextManager = fn => {
    return dbConnect().then(db => {
        let stationsCol = db.collection(STATIONS_COL);
        let readingsCol = db.collection(READINGS_COL);
        return fn();
    }).then(()=>{
        logger.info('closing the database');
        storage.disconnect();
    });
};

//@contextManager
// takes a list of stations
let fireUpdates = stations => {
    return dbConnect().then(db => {
        let stationsCol = db.collection(STATIONS_COL);
        let readingsCol = db.collection(READINGS_COL);
        logger.info('stations are', stations);
        logger.info(`querying ${stations.length} stations`);
        return reqUpdates(stations).then(updates => {
            logger.info(updates.length, 'updates');
            let readingsCol = db.collection(READINGS_COL);
            return readingsCol.insertMany(updates).catch(logger.info);
        });
    });
};
//fireUpdates = contextManager(fireUpdates);

if (process.argv[2] === 'seed') seedDB('wuStations.csv');
if (process.argv[2] === 'calcDistance') calcDistance();
if (process.argv[2] === 'updateStats') calcStationStats();
if (process.argv[2] === 'pullUpdates') {
    stationUtils.selected().then(stations => {
        fireUpdates(stations).then(() => {
            logger.info('gonna disc the db');
            storage.disconnect().then(logger.info);
        });
    });
}
if (process.argv.length < 3) logger.info('pass in a command: seed, updateStats or pullUpdates');

function reqUpdate(id) {
    let url = `http://api.wunderground.com/api/${WU_KEY}/conditions/q/pws:${id}.json`;
    // logger.info('hitting api', apiCounter++, url);
    process.stdout.write("#");
    return rp({uri: url, json:true}).then(resp => {
        if (resp.response.error) {
            throw resp.response.error.description || resp.response.error.type || 'wrong pws id';
        }
        const obs = resp.current_observation;
        let latitude = parseFloat(obs.observation_location.latitude);
        let longitude = parseFloat(obs.observation_location.longitude);
        if (isNaN(latitude) || isNaN(longitude)) throw 'bad station coordinates';
        let distance = distanceToPath(latitude, longitude);
        return {
            distance,
            pws: obs.station_id,
            city: obs.observation_location.city,
            state: obs.observation_location.state,
            elevation: obs.observation_location.elevation,
            latitude,
            longitude,
            coordinates: [longitude, latitude], // to use mongo's Geospatial Queries
            humidity: parseInt(obs.relative_humidity),
            readAt: new Date(parseInt(obs.observation_epoch)*1000), // consider the timezone?
            iconUrl: obs.icon_url,
            readAtLocal: obs.observation_time_rfc822,
            solarradiation: obs.solarradiation,
            uv: parseInt(obs.UV),
            lastReadingAge : ~~(Date.now()/1000 - parseInt(obs.observation_epoch)),
            temp: parseFloat(obs.temp_f),
            weather: obs.weather,
            requestTime: new Date(),
        };
    });
}

// closest distance to path
const pathPoints = eclipsePath();
function distanceToPath(lat, lon){
    let min = 100000; //in KM
    let poi = {latitude: lat, longitude: lon};
    for (var i = 0; i < pathPoints.length; i++) {
        let dist = geolib.getDistance(poi, {latitude: pathPoints[i][0], longitude: pathPoints[i][1]}) / 1000;
        if (dist > min) break;
        min = dist;
    }
    return min; //in KM
}

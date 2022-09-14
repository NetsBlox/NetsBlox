/* eslint-disable no-console */
const fs = require('fs'),
    geolib = require('geolib'),
    rp = require('request-promise'),
    utils = require('../../src/utils'),
    _ = require('lodash'),
    eclipsePath = require('./eclipsePath').center,
    stationUtils = require('../../../src/server/rpc/procedures/eclipse-2017/stations.js'),
    csv = require('fast-csv'),
    Storage = require('../../../src/server/storage/storage'),
    Logger = require('../../../src/server/logger'),
    logger = new Logger('netsblox:wu'),
    storage = new Storage(logger),
    rpcStorage = require('../../../src/server/rpc/storage.js');

const WU_KEY = process.env.WEATHER_UNDERGROUND_KEY,
    INTERVAL = 61 * 1000, //in msec
    API_LIMIT = 900; //per min

// parameters to config:
// 1. in fireUpdates: config available stations to poll, considering number of updates
let stationsCol, readingsCol;

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


function loadStations(fileName){
    let stations = [];
    let deferred = Q.defer();
    let stream = fs.createReadStream(fileName);
    var csvStream = csv
        .parse({headers:true, objectMode:true})
        .on('data', function(data){
            data.latitude = parseFloat(data.latitude);
            data.longitude = parseFloat(data.longitude);
            data.distance = parseFloat(data.distance);
            data.views = parseInt(data.views);
            data.elevation = parseInt(data.elevation);
            delete data.updatedAt;
            stations.push(data);
        })
        .on('end', function(){
            console.log('done loading stations');
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
        console.log(`getting updates from ${ids.length} stations ids`, ids.join());
        promises = promises.concat(ids.map(reqUpdate));
        if (stationChunks.length > 0) {
            setTimeout(fire, INTERVAL);
        }else {
            const responses = await Promise.allSettled(promises);
            responses = responses.filter(item => {
                if (item.state === 'rejected') {
                    console.log('failed', item.reason);
                    return false;
                }
                return true;
            });
            let updatesArr = responses.map(item => item.value);
            // change falsy updates' temp to 0
            updatesArr = updatesArr.map(up => {
                if ( up && up.temp < 0 ) up.temp = 0;
                return up;
            });
            deferred.resolve(updatesArr);
        }
    };
    fire();
    return deferred.promise;
}


// loads the stations collection for the first time
let seedDB = (fileName) => {
    return loadStations(fileName).then(stations => {
        getReadingsCol().createIndex({coordinates: '2dsphere'}); // this is not needed if we are not going to lookup reading based on lat lon
        getStationsCol().createIndex({coordinates: '2dsphere'});
        getReadingsCol().createIndex({pws: 1});
        getReadingsCol().createIndex({requestTime: -1});
        getReadingsCol().createIndex({readAt: -1});
        stations = stations.map(station => {
            station.coordinates = [station.longitude, station.latitude];
            return station;
        });
        return getStationsCol().insertMany(stations);
    });
};

// given enough readings in the readigsCollection calculates the average reading age for stations
// not returning proper promise
let calcStationStats = () => {
    let aggregateQuery = {
        $group: {
            _id: {pws: '$pws'},
            count: {$sum: 1},
            readingAvg: {$avg: '$lastReadingAge'},
            docs: {$push: '$_id'}
        }
    };
    console.log(aggregateQuery);
    return getReadingsCol().aggregate([aggregateQuery]).toArray().then(updates => {
        console.log('this many aggregated results', updates.length);
        // or load it all in the RAM
        let operationsPromise = [];
        updates.forEach(update => {
            let query = {pws: update._id.pws};
            // this is the most time consuming part.
            let opPromise = getReadingsCol().find(query).sort( {lastReadingAge:1} ).skip(update.count / 2 - 1).limit(1).toArray()
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
        console.log('operations', operations);
        return getStationsCol().bulkWrite(operations);
    }).catch(console.error);
};

function calcDistance(){
    getStationsCol().find().toArray().then(stations => {
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
        getStationsCol().bulkWrite(operations);
    });
} // end of calcDistance

//@contextManager
// takes a list of stations
let fireUpdates = getStations => {
    return getStations().then(reqUpdates).then(updates => {
        console.log(updates.length, 'updates');
        return getReadingsCol().insertMany(updates).catch(console.error);
    });
};
//fireUpdates = contextManager(fireUpdates);

// pre: interval in seconds
let scheduleUpdates = (getStationsFn, interval) => {
    fireUpdates(getStationsFn).then(() => {
        setTimeout(scheduleUpdates, interval, getStationsFn, interval);
    }).catch(() => {
        setTimeout(scheduleUpdates, interval, getStationsFn, interval);
    });
};

storage.connect().then(() => {
    if (process.argv[2] === 'seed') return seedDB('wuStations.csv');
    if (process.argv[2] === 'calcDistance') return calcDistance();
    if (process.argv[2] === 'updateStats') return calcStationStats();
    if (process.argv[2] === 'pullUpdates') return fireUpdates(stationUtils.selected);

    if (process.argv[2] === 'scheduleUpdates') {
        let interval = parseInt(process.argv[3])*1000;
        if(interval < 30000) return;
        scheduleUpdates(stationUtils.selected, interval);
    }
})
    .then(() => storage.disconnect());

if (process.argv.length < 3) console.log('pass in a command: seed, updateStats or pullUpdates');

function reqUpdate(id) {
    let url = `http://api.wunderground.com/api/${WU_KEY}/conditions/q/pws:${id}.json`;
    return rp({uri: url, json:true}).then(resp => {
        if (resp.response.error) {
            throw resp.response.error.description || resp.response.error.type || 'wrong pws id';
        }
        const obs = resp.current_observation;
        let latitude = parseFloat(obs.observation_location.latitude);
        let longitude = parseFloat(obs.observation_location.longitude);
        if (isNaN(latitude) || isNaN(longitude)) throw 'bad station coordinates';
        let distance = distanceToPath(latitude, longitude);
        let reading = {
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

        const now = Date.now();
        const delay = (now - reading.readAt.getTime())/(60*1000);  // in min
        if (delay > 30) console.error(`${id} reporting old reading from ${reading.readAt.toISOString()}`);
        return reading;
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
/* eslint-enable no-console */

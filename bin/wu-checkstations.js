const fs = require('fs'),
    geolib = require('geolib'),
    axios = require('axios'),
    Q = require('q'),
    _ = require('lodash'),
    eclipsePath = require('./eclipsePathCenter'),
    csv = require('fast-csv'),
    Storage = require('../src/server/storage/storage'),
    Logger = require('../src/server/logger'),
    logger = new Logger('netsblox:wu'),
    storage = new Storage(logger),
    csvWriter = require('csv-write-stream'),
    writer = csvWriter({headers: ['id','location','latitude','longitude','distance','lastReadingAge','temp','weather','requestTime']});

// TODO use other libraries for axios and csv read write
// TODO handle seeding and path coordinates in a better way

const STATIONS_COL = 'wuStations',
    READINGS_COL = 'wuReadings';
const WU_KEY = process.env.WEATHER_UNDERGROUND_KEY,
    INTERVAL = 61 * 1000,
    API_LIMIT = 900; //per min

let apiCounter = 0, connection;

// connect to nb database
let dbConnect = () => {
    const mongoUri = process.env.MONGO_URI || process.env.MONGOLAB_URI || 'mongodb://localhost:27017/admin';
    if (!connection) {
        connection = storage.connect(mongoUri);
    }
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
            console.log("done loading stations");
            deferred.resolve(stations);
        });

    stream.pipe(csvStream);
    return deferred.promise;
}


// gets a list of station ids
function reqUpdates(stations){
    let promises = [];
    let deferred = Q.defer();
    let rounds = Math.ceil(stations.length / API_LIMIT);
    let callsPerRound = Math.ceil(stations.length/rounds);
    // every minute query up to callsPerRound stations
    let stationChunks = _.chunk(stations, callsPerRound);
    let fire = () => {
        let ids = stationChunks.shift();
        console.log('getting updates from stations ids', ids);
        promises = promises.concat(ids.map(reqUpdate));
        if (stationChunks.length > 0) {
            setTimeout(fire, INTERVAL);
        }else {
            Q.allSettled(promises).done(responses => {
                responses = responses.filter(item => {
                    if (item.state === 'rejected') {
                        console.log('failed', item.reason);
                        return false;
                    }
                    return true;
                });
                let stationsArr = responses.map(item => item.value);
                deferred.resolve(stationsArr);

            })
        }
    };
    fire();
    return deferred.promise;
}


// loads the stations collection for the first time
let seedDB = (fileName) => {
    loadStations(fileName).then(stations => {
        return dbConnect().then(db => {
            console.log('connected to db');
            db.collection(READINGS_COL).createIndex({coordinates: "2dsphere"});
            let stationsCol = db.collection(STATIONS_COL);
            stationsCol.insertMany(stations).catch(console.log)
            return 'Loaded';
        })
    });
};

// TODO a better solution?
if (process.argv[2] === 'seed') seedDB('wuStations.csv');

// TODO the script doesn't return.
dbConnect().then(db => {
    let stationsCol = db.collection(STATIONS_COL);
    let readingsCol = db.collection(READINGS_COL);
    let query = {distance: {$lte: 50}};
    stationsCol.find(query).toArray().then(stations => {
        stations = stations.map(item => item.pws);
    // return readingsCol.distinct('pws',query).then(stations => {
        console.log('this many stations', stations.length);
        return reqUpdates(stations).then(updates => {
            console.log(updates.length, 'updates');
            let readingsCol = db.collection(READINGS_COL);
            // updates = updates.map(update => {pws: update.pws, temp = })
            return readingsCol.insertMany(updates).catch(console.log)
        })
    })

});


function exportStations(stations) {
    writer.pipe(fs.createWriteStream('levelNStations.csv', {flag: 'w'}));
    stations.forEach(station => {
        if(station.lastReadingAge < 61) writer.write(station);
    });
}


function reqUpdate(id) {
    let url = `http://api.wunderground.com/api/${WU_KEY}/conditions/q/pws:${id}.json`;
    // console.log('hitting api', apiCounter++, url);
    process.stdout.write("#")
    return axios.get(url).then(resp => {
        if (resp.data.response.error) {
            throw resp.data.response.error.description;
        }
        const obs = resp.data.current_observation

        let distance = distanceToPath(obs.observation_location.latitude, obs.observation_location.longitude);
        let latitude = parseFloat(obs.observation_location.latitude)
        let longitude = parseFloat(obs.observation_location.longitude)
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
            readAt: new Date(parseInt(obs.observation_epoch)*1000),
            iconUrl: obs.icon_url,
            readAtLocal: obs.observation_time_rfc822,
            solarradiation: obs.solarradiation,
            uv: parseInt(obs.UV),
            lastReadingAge : ~~(Date.now()/1000 - parseInt(obs.observation_epoch)),
            temp: parseFloat(obs.temp_f),
            weather: obs.weather,
            requestTime: new Date(),
        };
    }).catch(err => {
        console.error('station doesnt exists or pws is wrong:', id, err);
        throw(err);
    });
}



// closest distance to path
const pathPoints = eclipsePath();
function distanceToPath(lat, lon){
    let min = 100000; //in KM
    let poi = {latitude: lat, longitude: lon};
    for (var i = 0; i < pathPoints.length; i++) {
        let dist = geolib.getDistance(poi, {latitude: pathPoints[i][0], longitude: pathPoints[i][1]}) / 1000;
        // if(dist > min) break; // performance boost
        if (dist < min) min = dist;
    }
    return min; //in KM
}

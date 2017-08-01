const Storage = require('../../../storage/storage'),
    Logger = require('../../../logger'),
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

function bestReading(lat, lon, time){

    // TODO find the stations closest to the requested point. OR maybe find  stations whitin 10km, fails if none within limit kms

    // TODO whats the previous OR closest reading for the given time on that station.
    //
}

let temp = function(latitude, longitude, time){

    return dbConnect().then(db => {
        let stationsCol = db.collection(STATIONS_COL);
        let readingsCol = db.collection(READINGS_COL);

        //find the best reading for the request
        bestReading(latitude, longitude, time).then(reading => {

        });



        let query = {distance: {$lte: 50}};
        return stationsCol.find(query).toArray().then(stations => {
            return stations;
        })

    });
};




module.exports = {
    isStateless: true,
    temp: temp
};

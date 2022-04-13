const _ = require('lodash'),
    eclipsePathCenter = require('../../../../../utils/rpc/eclipse-2017/eclipsePath.js').center,
    rpcStorage = require('../../storage'),
    Logger = require('../../../logger.js'),
    logger = new Logger('netsblox:wu:stations'),
    stationIds = require('./stationIds.json');


let stationsCol;

// connect to nb database
let getStationsCol = () => {
    if (!stationsCol) {
        stationsCol = rpcStorage.create('wu:stations').collection;
    }
    return stationsCol;
};

// gets in a clean list of valid stations
function handPickStations(stations){
    let rules = {
        add: [],
        remove: ['KSCEASLE23','KWYMORAN2','KGAFLATS2', 'KORSPRAY3', 'KIDGARDE3', 'KSCLEXIN29', 'KMOBLACK2'],
    };
    // remove blacklists
    stations = stations.filter(station => {
        // to support function input both as list of ids and station objects
        let stationId = station.pws || station;
        return !rules.remove.includes(stationId);
    });
    // add whitelist
    // sort if added anything
    return stations;
}

function availableStations(maxDistance, maxReadingMedian){
    if (!maxReadingMedian) maxReadingMedian = Infinity;
    let query = {distance: {$lte: maxDistance}, readingMedian: {$ne: null, $lte: maxReadingMedian}};
    return getStationsCol().find(query).toArray()
        .then(stations => {
            logger.info(`found ${stations.length} stations for query ${JSON.stringify(query)} `);
            return stations;
        });
}


function nearbyStations(lat, lon,  maxDistance){
    lat = parseFloat(lat);
    lon = parseFloat(lon);
    // find stations uptodate stations within MAX_DISTANCE
    let closeStations = { coordinates: { $nearSphere: { $geometry: { type: 'Point', coordinates: [lon, lat] }, $maxDistance: maxDistance } } };
    closeStations.readingMedian = {$ne: null, $lte: 1800}; // lte: just to avoid getting slow stations
    return getStationsCol().find(closeStations).sort({readingMedian: 1}).toArray().then(stations => {
        // sorted array of stations by closest first
        logger.info(`found ${stations.length} stations within ${maxDistance/1000} of ${lat}, ${lon}`);
        return stations;
    });
} // end of nearbyStations

// need a way to make sure that the whole path is covered.
// divide the path into sections (using min max lon + distance should be fine)
// best station finder for a given section
// divide the path into n sections and return the stations for each section in a 2d array

// returns a 2d array of sectioned available and rated stations
function sectionStations(n){
    const pathMinLon = -124.2,
        pathMaxLon = -79.0,
        delta = (pathMaxLon - pathMinLon) / n;
    logger.info('delta is', delta);
    // returns the section index
    let findSection = lon => {
        return Math.floor((lon - pathMinLon) / delta);
    };
    // can filter very obsolete stations here.
    return availableStations(50, 600).then(stations => {
        let sections = new Array(n);
        stations.forEach(station => {
            let index = findSection(station.longitude);
            if (!sections[index]) sections[index] = [];
            sections[index].push(station);
        });
        return sections;
    }).catch(logger.info);
} // end of sectioned stations

// find best stations in each section
function pickBestStations(stations, maxCount){
    if (stations.length < maxCount) return stations;
    stations = _.sortBy(stations, ['readingMedian','distance']);
    return stations.slice(0,maxCount);
}

function idsToStations(ids){
    return getStationsCol().find({pws: {$in: ids}}).sort({longitude: 1}).toArray();
}

function selectSectionBased(numSections, perSection){
    numSections = parseInt(numSections);
    perSection = parseInt(perSection);
    logger.info(sectionStations);
    return sectionStations(numSections).then(sections => {
        sections = sections.map(stations => pickBestStations(stations, perSection));
        sections.forEach(section => {
            process.stdout.write(section.length+'');
        });
        let stations = sections.reduce((arr,val)=> arr.concat(val));
        stations = _.sortBy(stations, ['longitude']); // sort it so that they are ordered from west to east
        stations = handPickStations(stations);
        return stations;
    });
}

let selectPointBased = function(){
    let pointToStation = point => {
        return nearbyStations(point[0], point[1], 50000 )
            .then(stations => {
                return pickBestStations(stations,1)[0];
            }).catch(logger.info);
    };
    let stationPromises = eclipsePathCenter().map(pointToStation);
    logger.info(stationPromises);
    return Promise.all(stationPromises).then(stations => {
        stations = stations.filter(station => station);
        stations = handPickStations(stations);
        return stations;
    });
};

module.exports = {
    selected: ()=> idsToStations(handPickStations(stationIds)),
    // selected: dynamicStations,
    selectSectionBased,
    selectPointBased,
    pickBestStations,
    nearbyStations
};

const _ = require('lodash'),
    Storage = require('../../../storage/storage.js'),
    Logger = require('../../../logger.js'),
    logger = new Logger('netsblox:wu'),
    storage = new Storage(logger);


const STATIONS_COL = 'wuStations',
    READINGS_COL = 'wuReadings';
let connection;

let dbConnect = () => {
    const mongoUri = process.env.MONGO_URI || process.env.MONGOLAB_URI || 'mongodb://localhost:27017';
        connection = storage.connect(mongoUri);
        if (!connection) {
    }
    return connection;
};

// handpicked stations
const stationIds = [
    "KORWALDP9",
"KORSILET6",
"KORCORVA76",
"KORALBAN32",
"KORSALEM91",
"KORMOLAL30",
"KORCOLTO9",
"KORSISTE27",
"KORSISTE21",
"KORREDMO10",
"KORPRINE21",
"KORPRINE26",
"KORMITCH2",
"KORMITCH1",
"KORSPRAY3",
"KORDAYVI2",
"KORLONGC2",
"KORPRAIR5",
"KORGRANI2",
"KORSUMPT2",
"KORBAKER6",
"KORRICHL2",
"KORONTAR6",
"KIDEMMET10",
"KIDEMMET8",
"KIDHORSE2",
"KIDGARDE3",
"KIDSUNVA4",
"KIDCHALL5",
"KIDHOWE2",
"KIDSHELL2",
"KIDREXBU10",
"KIDRIGBY4",
"KIDBATES2",
"KIDDRIGG3",
"KWYRAFTE2",
// "KWYMORAN2",
"KWYBONDU4",
"KWYCORA2",
"KWYDUBOI4",
"KWYLANDE12",
"KWYRIVER4",
"KWYCASPE41",
"KWYCASPE61",
"KWYGLENR2",
"KWYDOUGL14",
"KWYWHEAT11",
"KWYLUSK3",
"KWYTORRI6",
"KNEHARRI4",
"KNEMITCH4",
"KNECRAWF2",
"KNEBRIDG4",
"KNEALLIA6",
"KNEBINGH2",
"KNESUTHE2",
"KNENORTH15",
"KNENORTH3",
"KNEARNOL2",
"KNECOZAD2",
"KNEBROKE3",
"KNEANSLE3",
"KNEHAZAR2",
"KNEKEARN9",
"KNEWOODR2",
"KNEGRAND15",
"KNEHARVA2",
"KNEHENDE5",
"KNEGENEV4",
"KNEFAIRB2",
"KNECRETE5",
"KNELINCO49",
"KNESYRAC2",
"KNEPERU2",
"KMOOREGO2",
"KMOSAINT102",
"KMOKANSA37",
"KMOKANSA197",
"KMORICHM3",
"KMORICHM4",
"KMOBLACK3",
"KMOHALE3",
"KMOSMITH11",
"KMOCALIF4",
"KMOCOLUM9",
"KMOFULTO4",
"KMOFULTO2",
"KMOMONTG3",
"KMOHERMA2",
"KMOUNION5",
"KMOBLACK2",
"KMOCHEST14",
"KMOSTEGE3",
"KILREDBU4",
"KMOJACKS5",
"KILPINCK2",
"KKYLACEN3",
"KKYWESTF2",
"KKYBENTO2",
"KKYGILBE2",
"KKYCADIZ8",
"KKYHOPKI3",
"KTNCLARK18",
"KKYKENTU9",
"KTNNASHV174",
"KTNSMYRN7",
"KTNMURFR10",
"KTNMCMIN16",
"KTNCOOKE12",
"KTNCOOKE10",
"KTNSODDY6",
"KTNCLEVE22",
"KGAEPWOR3",
"KTNFRIEN1",
"KTNMARYV49",
"KGASAUTE2",
"KGACLAYT12",
"KGAFLATS2",
"KSCLIBER2",
// "KSCEASLE23",
"KSCGREER47",
"KSCEDGEF1",
"KSCSALUD5",
"KSCLEXIN29",
"KSCLEXIN52",
"KSCBLYTH12",
"KSCSAINT8",
"KSCSUMME14",
"KSCCHARL86",
"KSCMOUNT15",
"KSCGEORG8",
"KSCGEORG15"
];

function handPickStations(stations){
    let rules = {
        add: [],
        remove: ["KSCEASLE23","KWYMORAN2"],
    }
    // remove blacklists
    stations = stations.filter(station => !rules.remove.includes(station.pws))    
    // add whitelist
    // sort if added anything
    return stations;
}

function availableStations(db, maxDistance, maxReadingMedian){
    if (!maxReadingMedian) maxReadingMedian = Infinity;
    let query = {distance: {$lte: maxDistance}, readingMedian: {$ne: null, $lte: maxReadingMedian}};
    return db.collection(STATIONS_COL).find(query).toArray()
    .then(stations => {
        console.log(`found ${stations.length} stations for query ${JSON.stringify(query)} `);
        return stations;
    });
}

function dynamicStations(){
    const numSections = 160;
    const perSection = 1;
    return selectSectionBased(numSections, perSection).then(stations => {
        return stations.map(station => station.pws);
    })
}

// need a way to make sure that the whole path is covered.
// divide the path into sections (using min max lon + distance should be fine)
// best station finder for a given section
// divide the path into n sections and return the stations for each section in a 2d array

// returns a 2d array of sectioned available and rated stations
function sectionStations(n){
    const pathMinLon = -124.2,
    pathMaxLon = -79.0,
    delta = (pathMaxLon - pathMinLon) / n;
    console.log('delta is', delta);
    // returns the secion index
    let findSection = lon => {
        return Math.floor((lon - pathMinLon) / delta);
    };
    return dbConnect().then(db => {
        // can filter very obsolete stations here.
        return availableStations(db, 50, 600).then(stations => {
            let sections = new Array(n);
            stations.forEach(station => {
                let index = findSection(station.longitude);
                if (!sections[index]) sections[index] = [];
                sections[index].push(station);
            })
            return sections;
        }).catch(console.log)
    })
} // end of sectioned stations

// find best stations in each section
function pickBestStations(stations, maxCount){
    if (stations.length < maxCount) return stations;
    stations = _.sortBy(stations, ['readingMedian','distance']);
    return stations.slice(0,maxCount);
}


function selectSectionBased(numSections, perSection){
    numSections = parseInt(numSections);
    perSection = parseInt(perSection);
    console.log(sectionStations)
    return sectionStations(numSections).then(sections => {
        sections = sections.map(stations => pickBestStations(stations, perSection));
        sections.forEach(section => {
            process.stdout.write(section.length+'');
        })
        let stations = sections.reduce((arr,val)=> arr.concat(val));
        stations = _.sortBy(stations, ['longitude']); // sort it so that they are ordered from west to east
        stations = handPickStations(stations);
        return stations;
    });
}

module.exports = {
    selected: ()=> Promise.resolve(stationIds),
    // selected: dynamicStations,
    selectSectionBased,
    pickBestStations
}

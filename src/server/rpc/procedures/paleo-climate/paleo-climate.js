/**
 * Access to NOAA Paleoclimatology ice core data.
 *
 * For more information, check out
 * https://www.ncdc.noaa.gov/data-access/paleoclimatology-data/datasets/ice-core
 *
 * Original datasets are available at
 * https://www1.ncdc.noaa.gov/pub/data/paleo/icecore/antarctica/antarctica2015co2composite.txt
 * https://www1.ncdc.noaa.gov/pub/data/paleo/icecore/antarctica/antarctica2015co2law.txt
 * https://www1.ncdc.noaa.gov/pub/data/paleo/icecore/antarctica/law/law2012d18o.txt
 * https://www1.ncdc.noaa.gov/pub/data/paleo/icecore/antarctica/antarctica2015co2wais.txt
 * https://www1.ncdc.noaa.gov/pub/data/paleo/icecore/antarctica/wdc05a2013d18o.txt
 * https://www1.ncdc.noaa.gov/pub/data/paleo/icecore/antarctica/epica_domec/edc3deuttemp2007.txt
 * https://www1.ncdc.noaa.gov/pub/data/paleo/icecore/antarctica/vostok/deutnat.txt
 *
 * @service
 */

const _ = require('lodash');
const DBConsumer = require('../utils/db-consumer');
const getServiceStorage = require('../../advancedStorage');
const DATA_TYPES = ['Delta18O', 'Carbon Dioxide', 'Deuterium', 'Temperature'];
const schema = {
    core: String,
    datatype: String,
    year: Number,
    value: Number
};
const PaleoStorage = getServiceStorage ('PaleoClimate', schema);
const PaleoClimate = new DBConsumer('PaleoClimate', PaleoStorage);
const schemaMetadata = {core: String};
DATA_TYPES
    .forEach(type => schemaMetadata[type] = {count: Number, earliest: Number, latest: Number});
const PaleoMetadata = getServiceStorage ('PaleoClimateMetadata', schemaMetadata);

/**
 * Sets up the database
 */
function importData() {
    const records = require('./data');

    const metadata = {};
    const initCoreMetadata = core => {
        const stats = {core};
        DATA_TYPES
            .forEach(type => stats[type] = {count: 0, earliest: Infinity, latest: -Infinity});
        return stats;
    };
    PaleoClimate.getIceCoreNames().forEach(name => metadata[name] = initCoreMetadata(name));

    for (let i = records.length; i--;) {
        const {core, datatype, year} = records[i];
        validateIceCore(core);
        if (!DATA_TYPES.includes(datatype)) {
            throw new Error(`Unrecognized data type "${datatype}" in dataset.`);
        }

        const dataStatistics = metadata[core][datatype];
        dataStatistics.count += 1;
        dataStatistics.earliest = Math.min(dataStatistics.earliest, year);
        dataStatistics.latest = Math.max(dataStatistics.latest, year);
    }

    PaleoClimate.getIceCoreNames().forEach(core => {
        const totalCount = DATA_TYPES
            .map(type => metadata[core][type].count)
            .reduce((a,b) => a + b, 0);

        if (totalCount === 0) {
            PaleoClimate._logger.warn(`No data imported for ice core "${core}"`);
        }
    });
    PaleoClimate._logger.info(`adding ${records.length} climate records`);
    PaleoStorage.insertMany(records);
    PaleoMetadata.insertMany(Object.values(metadata));
}

// Test for existing data
PaleoStorage.findOne({}).then(result => {
    if (!result) {
        PaleoClimate._logger.info('No data found in database, importing from data files.');
        importData();
    }
});

function validateIceCore(core) {
    const validCores = PaleoClimate.getIceCoreNames();
    if(!validCores.includes(core)) {
        const coreList = validCores.slice(0, validCores.length-1).join(', ') +
            `, or ${validCores[validCores.length-1]}`;
        throw new Error(`Ice core is not valid. Expected ${coreList}`);
    }
}

// Core meta-data
PaleoClimate._coreMetadata = {
    'Antarctic Composite CO2': {
        name: 'Antarctic Composite CO2',
        description: 'A composite dataset with records from various Antarctic ice cores.',
        latitude: -75.09978,
        longitude: 123.332196,
    },
    'Dome C': {
        name: 'Dome Charlie',
        description: 'The European Project for Ice Coring in Antarctica began drilling in 1996, reaching 3270 meters deep.',
        latitude: -75.09978,
        longitude: 123.332196,
    },
    Law: {
        name: 'Law Dome',
        description: 'The Law Dome data comes from three ice cores in East Antarctica, drilled from 1987 to 1993.',
        latitude: -66.733333,
        longitude: 112.833333,
    },
    WAIS: {
        name: 'West Antarctic Ice Sheet Divide',
        description: 'The WAIS Divide Ice Core Project ran from 2005 to 2011, drilling 3405 meters deep, 50 meters above the bed of the sheet.',
        latitude: -79.467472,
        longitude: -112.086389,
    },
    GRIP: {
        name: 'Greenland Ice Core Project',
        description: 'The Greenland Ice Core Project ran from 1989 to 1995, drilling a 3029 meter ice core to the bed of the Greenland Ice Sheet.',
        latitude: 72.579,
        longitude: -37.565333,
    },
    Vostok: {
        name: 'Vostok Ice Core',
        description: 'In January 1998, the collaborative ice-drilling project between Russia, the United States, and France at the Russian Vostok station in East Antarctica yielded the deepest ice core ever recovered, reaching a depth of 3,623 m (Petit et al. 1997, 1999).',
        latitude: -78.4644818,
        longitude: 106.8317313,
    }
};

PaleoClimate._getColumnData = async function(core, datatype, startyear, endyear) {
    validateIceCore(core);

    const fields = ['core', 'datatype'];
    const queries = [core, datatype];

    if(startyear !== undefined || endyear !== undefined){
        const query = {};

        // Range query for years
        if(startyear !== undefined){
            query['$gte'] = Number.parseInt(startyear);
        }

        if(endyear !== undefined){
            query['$lte'] = Number.parseInt(endyear);
        }

        fields.push('year');
        queries.push(query);
    }

    // Perform search
    const records = (await this._advancedSearch(fields, queries, 0, -1))
        .sort((a,b) => a.year - b.year);

    return _.sortedUniqBy(records, entry => entry.year)  // deduplicate by year
        .map(entry => [entry.year, entry.value]);
};

/**
 * Get names of ice cores with data available.
 * @returns {Array}
 */
PaleoClimate.getIceCoreNames = function() {
    return Object.keys(PaleoClimate._coreMetadata); 
}; 

/**
 * Get CO2 in ppm (parts per million) by year from the ice core.
 *
 * If a start and end year is provided, only measurements within the given range will be
 * returned.
 *
 * @param {String} core Core to get data from
 * @param {Number=} startyear Year to begin data at
 * @param {Number=} endyear Year to begin data at
 * @returns {Array}
 */
PaleoClimate.getCarbonDioxideData = function(core, startyear, endyear){
    return PaleoClimate._getColumnData(core, 'Carbon Dioxide', startyear, endyear);
};

/**
 * Get delta-O-18 in per mil (parts per thousand) by year from the ice core.
 *
 * If a start and end year is provided, only measurements within the given range will be
 * returned.
 *
 * @param {String} core Ice core to get data from
 * @param {Number=} startyear
 * @param {Number=} endyear
 * @returns {Array}
 */
PaleoClimate.getDelta18OData = function(core, startyear, endyear){
    return PaleoClimate._getColumnData(core, 'Delta18O', startyear, endyear);
};

/**
 * Get deuterium in per mil (parts per thousand) by year from the ice core.
 *
 * If a start and end year is provided, only measurements within the given range will be
 * returned.
 *
 * @param {String} core Ice core to get data from
 * @param {Number=} startyear
 * @param {Number=} endyear
 * @returns {Array}
 */
PaleoClimate.getDeuteriumData = function(core, startyear, endyear){
    return PaleoClimate._getColumnData(core, 'Deuterium', startyear, endyear);
};

/**
 * Get temperature difference by year from the ice core.
 *
 * If a start and end year is provided, only measurements within the given range will be
 * returned.
 *
 * @param {String} core Ice core to get data from
 * @param {Number=} startyear
 * @param {Number=} endyear
 * @returns {Array}
 */
PaleoClimate.getTemperatureData = function(core, startyear, endyear){
    return PaleoClimate._getColumnData(core, 'Temperature', startyear, endyear);
};

/**
 * Get metadata about an ice core including statistics about the available data.
 *
 * @param {String} core Name of core to get metadata of
 */
PaleoClimate.getIceCoreMetadata = async function(core){
    validateIceCore(core);
    const metadata = this._coreMetadata[core];
    const dataStatistics = await PaleoMetadata.findOne({core}).lean();
    metadata.data = _.pick(dataStatistics, DATA_TYPES);
    return metadata;
};

module.exports = PaleoClimate;

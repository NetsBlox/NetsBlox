/**
 * Access to NOAA Paleoclimatology ice core data
 * https://www.ncdc.noaa.gov/data-access/paleoclimatology-data/datasets/ice-core
 * @service
 */

const DBConsumer = require('../utils/db-consumer');
const getServiceStorage = require('../../advancedStorage');
const seeder = require('../utils/csv-loader');
const path = require('path');
const fs = require('fs');

const schemaDef = {
    core: String,
    datatype: String,
    year: Number,
    value: Number
};

const PaleoStorage = getServiceStorage ('PaleoClimate', schemaDef);
const PaleoClimate = new DBConsumer('PaleoClimate', PaleoStorage);
const DATA_TYPES = ['Oxygen', 'Carbon Dioxide', 'Deuterium', 'Temperature'];

/**
 * Sets up the database
 */
function seed() {
    const opts = {
        url: undefined, 
        filePath:  path.join(__dirname, 'composite.csv'),
        recParser:function(aRecord) { // optional
            if (isNaN(parseInt(aRecord.year))){
                return null; 
            }else{
                aRecord.year = parseInt(aRecord.year); 
            } 
            if (isNaN(parseFloat(aRecord.value))) {
                return null; 
            }else{
                aRecord.CO2Concentration = parseFloat(aRecord.value); 
            }
            if (isNaN(parseFloat(aRecord.Error))){
                delete aRecord.Error;
            }else{
                aRecord.Error = parseFloat(aRecord.Error); 
            } 
            return aRecord;
        }
    };
  
    seeder(PaleoStorage, opts);

    const records = require('./data');
    PaleoClimate._logger.info(`adding ${records.length} climate records`);
    PaleoStorage.insertMany(records);
}

// Test for existing data
// FIXME: There is a simpler test that we could do here...
PaleoClimate._advancedSearch('core', 'Dome C').then(result =>
{
    // Database needs to be set up
    if(result.length === 0){
        PaleoClimate._logger.warn('No Paleo Climate RPC data found, attempting to load from composite.csv');
        seed();
    }
}).catch(() => {
    PaleoClimate._logger.warn('No Paleo Climate RPC data found, attempting to load from composite.csv');
    seed();
});

/**
 * Get all valid names of ice cores
 * @returns {Array}
 */
PaleoClimate.getIceCoreNames = function() {
    return ['Dome C', 'Law', 'WAIS', 'GRIP', 'Vostok']; 
}; 

// Core meta-data
PaleoClimate._coreMetadata = {
    'Antarctic Composite CO2': {
        name: 'Antarctic Composite CO2',
        description: 'A composite dataset with records from various Antarctic ice cores.',
        latitude: -75.09978,
        longitude: 123.332196,
    },
    'Dome C': {
        name: 'Dome Charlie',  // TODO: Change this
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

PaleoClimate._shorthand = {
    'co2': 'Carbon Dioxide',
    'o2': 'Oxygen',
    'carbondioxide': 'Carbon Dioxide',
    'oxy': 'Oxygen',
    'carbon dioxide': 'Carbon Dioxide',
    'oxygen': 'Oxygen',
};

/**
 * Get data for all columns matching the given fields
 * @param {Number=} startyear Year to begin data at
 * @param {Number=} endyear Year to begin data at
 * @param {String=} datatype Data type to retrieve
 * @param {String=} core Core to get data from
 * @returns {Array}
 */
PaleoClimate._getAllData = function(core, datatype, startyear='', endyear=''){	// blank query gives total list
    const fields = [];
    const queries = [];

    if(startyear !== '' || endyear !== ''){
        const query = {};

        // Range query for years
        if(startyear !== ''){
            query['$gte'] = Number.parseInt(startyear);
        }

        if(endyear !== ''){
            query['$lte'] = Number.parseInt(endyear);
        }

        fields.push('year');
        queries.push(query);
    }

    if(datatype !== ''){
        // Allow shorthand
        if(Object.keys(this._shorthand).indexOf(datatype.toLowerCase()) !== -1){
            datatype = this._shorthand[datatype.toLowerCase()];
        }

        // Test for valid
        if(!DATA_TYPES.includes(datatype)){
            throw 'Invalid datatype';
        }

        fields.push('datatype');
        queries.push(datatype);
    }

    if(core !== ''){
        // Test for valid
        if(this.getIceCoreNames().indexOf(core) === -1){
            throw 'Invalid core';
        }

        fields.push('core');
        queries.push(core);
    }
    
    // Perform search
    return this._advancedSearch(fields, queries, 0, -1).then(list => {
        let formatted = list.map(entry => [entry.year, entry.core, entry.datatype, entry.value]);
        formatted = formatted.filter((r, idx, list) => list.findIndex(row => row[0] === r[0]) >= idx);
        return formatted.sort((a,b) => a[0] - b[0]);
    });
};
    
PaleoClimate._getColumnData = function(core, datatype, startyear, endyear){
    return PaleoClimate._getAllData(core, datatype, startyear, endyear)
        .then(result => result.map(row => [row[0],row[3]]));
};

/**
 * Get years and one datatype column matching the given fields
 *
 * @param {String} core Core to get data from
 * @param {String} datatype Data type to retrieve
 * @param {Number} startyear Year to begin data at
 * @param {Number} endyear Year to begin data at
 * @returns {Array}
 */
PaleoClimate.getCarbonDioxideData = function(core, startyear, endyear){
    return PaleoClimate._getColumnData(core, 'Carbon Dioxide', startyear, endyear);
};

// TODO: Add RPC annotations
PaleoClimate.getOxygenData = function(core, startyear, endyear){
    return PaleoClimate._getColumnData(core, 'Oxygen', startyear, endyear);
};

PaleoClimate.getDeuteriumData = function(core, startyear, endyear){
    return PaleoClimate._getColumnData(core, 'Deuterium', startyear, endyear);
};

PaleoClimate.getTemperatureData = function(core, startyear, endyear){
    return PaleoClimate._getColumnData(core, 'Temperature', startyear, endyear);
};

/**
 * Get metadata about a core. Returns full name, description, latitude, longitude, minimum date, maximum data, number of Carbon Dioxide datapoints, and number of Oxygen datapoints.
 * @param {String} core Name of core to get metadata of
 */
PaleoClimate.getCoreMetadata = function(core){
    // Test for valid
    const metadata = this._coreMetadata[core];

    if(!metadata) {
        throw new Error('Invalid core');
    }

    // TODO: This doesn't need to be recomputed each time...
    return PaleoClimate._getAllData(core, '', '', '').then(result => {
        const dataInfo = {};
        DATA_TYPES
            .forEach(type => dataInfo[type] = {count: 0, earliest: Infinity, latest: -Infinity});

        result.forEach(row => {
            const [date, , type] = row;
            if (!dataInfo[type]) {
                throw new Error(`Unrecognized data type "${type}" in dataset.`);
            }
            dataInfo[type].count += 1;
            dataInfo[type].earliest = Math.min(dataInfo[type].earliest, date);
            dataInfo[type].latest = Math.max(dataInfo[type].latest, date);
        });

        metadata.data = dataInfo;
        return metadata;
    }); 
};

module.exports = PaleoClimate;

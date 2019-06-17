/**
 * Access to NOAA Paleoclimatology ice core data
 * https://www.ncdc.noaa.gov/data-access/paleoclimatology-data/datasets/ice-core
 * @service
 */

const DBConsumer = require('../utils/db-consumer');
const getServiceStorage = require('../../advancedStorage');
const seeder = require('../utils/csv-loader');
const path = require('path');

const schemaDef = {
    core: String,
    datatype: String,
    year: Number,
    value: Number
};

const PaleoObject = getServiceStorage ('paleo', schemaDef);
const paleo = new DBConsumer('paleo', PaleoObject);

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
  
    seeder(PaleoObject, opts);
}

// Test for existing data
paleo._advancedSearch('core', 'Dome C').then(result =>
{
    // Database needs to be set up
    if(result.length === 0){
        paleo._logger.warn('No Paleo Climate RPC data found, attempting to load from composite.csv');
        seed();
    }
}).catch(() => {
    paleo._logger.warn('No Paleo Climate RPC data found, attempting to load from composite.csv');
    seed();
});

/**
 * Get all valid names of ice cores
 * @returns {Array}
 */
paleo.cores = function() {
    return ['Dome C', 'Law', 'WAIS', 'GRIP']; 
}; 

// Core meta-data
paleo._longnames = {
    'Dome C': 'Dome Charlie',
    'Law': 'Law Dome',
    'WAIS': 'West Antarctic Ice Sheet Divide',
    'GRIP': 'Greenland Ice Core Project',
};

paleo._descriptions = {
    'Dome C': 'The European Project for Ice Coring in Antarctica began drilling in 1996, reaching 3270 meters deep.',
    'Law': 'The Law Dome data comes from three ice cores in East Antarctica, drilled from 1987 to 1993.',
    'WAIS': 'The WAIS Divide Ice Core Project ran from 2005 to 2011, drilling 3405 meters deep, 50 meters above the bed of the sheet.',
    'GRIP': 'The Greenland Ice Core Project ran from 1989 to 1995, drilling a 3029 meter ice core to the bed of the Greenland Ice Sheet.',
};

paleo._latitudes = {
    'Dome C': -75.09978,
    'Law': -66.733333,
    'WAIS': -79.467472,
    'GRIP': 72.579,
};

paleo._longitudes = {
    'Dome C': 123.332196,
    'Law': 112.833333,
    'WAIS': -112.086389,
    'GRIP': -37.565333,
};

/**
 * Get all valid names of data types
 * @returns {Array}
 */
paleo.dataTypes = function() {
    return ['Oxygen', 'Carbon Dioxide']; 
}; 
         
paleo._shorthand = {
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
paleo._getAllData = function(startyear, endyear, datatype, core){	// blank query gives total list
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
            datatype = this._shorthand[datatype];
        }

        // Test for valid
        if(this.dataTypes().indexOf(datatype) === -1){
            throw 'Invalid datatype';
        }

        fields.push('datatype');
        queries.push(datatype);
    }

    if(core !== ''){
        // Test for valid
        if(this.cores().indexOf(core) === -1){
            throw 'Invalid core';
        }

        fields.push('core');
        queries.push(core);
    }
    
    // Perform search
    return this._advancedSearch(fields, queries, 0, -1).then(list => 
        list.map(entry => [entry.year, entry.core, entry.datatype, entry.value])
    );
};
    
/**
 * Get years and one datatype column matching the given fields
 * @param {Number} startyear Year to begin data at
 * @param {Number} endyear Year to begin data at
 * @param {String} datatype Data type to retrieve
 * @param {String} core Core to get data from
 * @returns {Array}
 */
paleo.getColumnData = function(startyear, endyear, datatype, core){
    return paleo._getAllData(startyear, endyear, datatype, core).then(result => result.map(row => [row[0],row[3]]));    
};

/**
 * Get metadata about a core. Returns full name, description, latitude, longitude, minimum date, maximum data, number of Carbon Dioxide datapoints, and number of Oxygen datapoints.
 * @param {String} core Name of core to get metadata of
 */
paleo.getCoreMetadata = function(core){
    // Test for valid
    if(this.cores().indexOf(core) === -1){
        throw 'Invalid core';
    }

    let longname = this._longnames[core];
    let description = this._descriptions[core];
    let lat = this._latitudes[core];
    let lon = this._longitudes[core];

    return paleo._getAllData('', '', '', core).then(result => {
        let dates = result.map(row => row[0]);
        let mindate = Math.min(...dates);
        let maxdate = Math.max(...dates);
        let numco2points = result.filter(row => row[2] === 'Carbon Dioxide').length;
        let numo2points = result.length - numco2points;
    
        return [longname, description, lat, lon, mindate, maxdate, numco2points, numo2points];    
    }); 
};


paleo.serviceName = 'PaleoClimate';

module.exports = paleo;
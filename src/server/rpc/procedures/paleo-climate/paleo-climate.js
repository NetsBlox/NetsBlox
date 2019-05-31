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
});

/**
 * Get all valid names of ice cores
 * @returns {Array}
 */
paleo.cores = function() {
    return ['Dome C', 'Law', 'WAIS', 'GRIP']; 
}; 

/**
 * Get all valid names of data types
 * @returns {Array}
 */
paleo.dataTypes = function() {
    return ['Oxygen', 'Carbon Dioxide']; 
}; 
            
/**
 * Get data for all columns matching the given fields
 * @param {Number=} startyear Year to begin data at
 * @param {Number=} endyear Year to begin data at
 * @param {String=} datatype Data type to retrieve
 * @param {String=} core Core to get data from
 * @returns {Array}
 */
paleo.getAllData = function(startyear = '', endyear = '', datatype = '', core = ''){	// blank query gives total list
    const fields = [];
    const queries = [];

    if(startyear !== '' || endyear !== ''){
        fields.push('year');

        const query = {};

        // Range query for years
        if(startyear !== ''){
            query['$gte'] = Number.parseInt(startyear);
        }

        if(endyear !== ''){
            query['$lte'] = Number.parseInt(endyear);
        }

        queries.push(query);
    }

    if(datatype !== ''){
        // Allow shorthand
        if(datatype === 'CO2'){
            datatype = 'Carbon Dioxide';
        }

        if(datatype === 'O2'){
            datatype = 'Oxygen';
        }

        fields.push('datatype');

        // Test for valid
        if(this.dataTypes().indexOf(datatype) === -1){
            throw 'Invalid datatype';
        }

        queries.push(datatype);
    }

    if(core !== ''){
        fields.push('core');

        // Test for valid
        if(this.cores().indexOf(core) === -1){
            throw 'Invalid datatype';
        }

        queries.push(core);
    }
    
    // Perform search
    return this._advancedSearch(fields, queries, 0, -1).then(list => {
        return list.map(entry => {
            return [entry.year, entry.core, entry.datatype, entry.value];
        });
    });
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
    return paleo.getAllData(startyear, endyear, datatype, core).then(result => result.map(row => [row[0],row[3]]));    
};

paleo.serviceName = 'PaleoClimate';

module.exports = paleo;
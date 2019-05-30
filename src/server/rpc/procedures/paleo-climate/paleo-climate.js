/**
 * access to NOAA paleo
 * @service
 */
const DBConsumer = require('../utils/db-consumer');
const getServiceStorage = require('../../advancedStorage');
const seeder = require('../utils/csv-loader');
const path = require('path');

const schemaDef = {
    core: String,
    datatype: String,
    year: String,
    value: String
};

const PaleoObject = getServiceStorage ('paleo', schemaDef);
const paleo = new DBConsumer('paleo', PaleoObject);

const featuredFields = [
    'core',
    'datatype',
    'year',
    'value'
];

paleo._genRPCs(featuredFields);

function seed() {
    const opts = {
        url: undefined, 
        filePath:  path.join(__dirname, 'composite.csv'),
        recParser:function(aRecord) { // optional
            if (isNaN(parseInt(aRecord.year))){
                paleo._logger.warn(aRecord);
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

    paleo._logger.warn(opts);
  
    //make rec parser funciton and then call this with seeder 
    seeder(PaleoObject, opts);
}

// Test for existing data
paleo.searchByCore('Dome C').then(result =>
{
    if(result.length === 0){
        paleo._logger.warn('No Paleo Climate RPC data found, attempting to load from composite.csv');
        seed();
    }
});

//get list of fields in database
paleo.fields = function() {
    return this._fields();
};

paleo.cores = function() {
    return ['Dome C', 'Law', 'WAIS', 'GRIP']; 
}; 

paleo.dataTypes = function() {
    return ['Oxygen', 'Carbon Dioxide']; 
}; 

paleo.serviceName = 'PaleoClimate';

module.exports = paleo;
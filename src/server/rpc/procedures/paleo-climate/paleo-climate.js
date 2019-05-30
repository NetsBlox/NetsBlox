/**
 * access to NOAA paleo
 * @service
 */

const PaleoObject = require('./database.js');
const DBConsumer = require('../utils/db-consumer');
const paleo = new DBConsumer('paleo', PaleoObject);

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

//returns lists of the value of the data asked for
paleo.iceCoreData = function(datatype,core){	// blank query gives total list
    return (this._iceCoreData(datatype, core));
};

//returns lists of years associated with data values asked for	
paleo.iceCoreDataYear = function(datatype,core){	// blank query gives total list
    return (this._iceCoreDataYear(datatype, core));
};

// returns a sepecific piece of data 
paleo.dataSearch = function(datatype,core,year){	// blank query gives total list
    return (this._dataSearch(datatype, core, year));
};
			
paleo.yearRange = function(startyear, endyear, datatype, core){	// blank query gives total list
    return (this._yearRange(startyear, endyear, datatype, core));
};

paleo.yearRangeYr = function(startyear, endyear, datatype, core){	// blank query gives total list
    return (this._yearRangeYr(startyear, endyear, datatype, core));
};

module.exports = paleo;
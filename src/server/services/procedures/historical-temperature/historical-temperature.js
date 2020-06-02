/**
 * Access to Berkeley Earth data
 *
 * See http://berkeleyearth.org/data/ for additional details.
 *
 * @alpha
 * @service
 * @category Science
 * @category Climate
 */

const ApiConsumer = require('../utils/api-consumer');
const BerkeleyEarth = new ApiConsumer('HistoricalTemperature', 'http://berkeleyearth.lbl.gov/auto/', { cache: { ttl: 60 * 60 * 24 * 30 } });
const rewordError = err => {
    if (err.statusCode === 404) {
        return 'Unknown country or region';
    }
};

/*
 * Associates less obviously named regions to their URLs
 */
const regionsDictionary = {
    allland: 'Global/Complete_TAVG_complete.txt',
    global: 'Global/Land_and_Ocean_complete.txt',
    northern: 'Regional/TAVG/Text/northern-hemisphere-TAVG-Trend.txt',
    southern: 'Regional/TAVG/Text/southern-hemisphere-TAVG-Trend.txt',
};

/**
 * Get the monthly anomaly data for a region
 * @param {String} country Name of country
 * @returns {Array<Array>} Monthly data points
 */
BerkeleyEarth.monthlyAnomaly = function (country) {
    return this._getCountryData(country, 'monthly');
};

/**
 * Get the 12 month averaged anomaly data for a region
 * @param {String} country Name of country
 * @returns {Array<Array>} Monthly data points
 */
BerkeleyEarth.annualAnomaly = function (country) {
    return this._getCountryData(country, 'annual');
};

/**
 * Get the 5-year averaged anomaly data for a region
 * @param {String} country Name of country
 * @returns {Array<Array>} Monthly data points
 */
BerkeleyEarth.fiveYearAnomaly = function (country) {
    return this._getCountryData(country, '5year');
};

/**
 * Get the 10-year averaged anomaly data for a region
 * @param {String} country Name of country
 * @returns {Array<Array>} Monthly data points
 */
BerkeleyEarth.tenYearAnomaly = function (country) {
    return this._getCountryData(country, '10year');
};

/**
 * Get the 20-year averaged anomaly data for a region
 * @param {String} country Name of country
 * @returns {Array<Array>} Monthly data points
 */
BerkeleyEarth.twentyYearAnomaly = function (country) {
    return this._getCountryData(country, '20year');
};

const dataColumns = {
    'monthly': 2,
    'annual': 4,
    '5year': 6,
    '10year': 8,
    '20year': 10,
};

/**
 * Requests the data for a country/region
 * @param {String} country Country/region to get data for
 * @param {String} type Type of data to return
 * @returns {Array<Array>} Parsed data
 */
BerkeleyEarth._getCountryData = function (country, type) {
    country = country.toLowerCase().trim().replace(/\s+/, '-');
    const options = {
        path: `Regional/TAVG/Text/${country}-TAVG-Trend.txt`
    };
    // Check for special region names
    if (Object.keys(regionsDictionary).indexOf(country) !== -1) {
        options.path = regionsDictionary[country];
    }
    return this._requestData(options).then(this._extractData.bind(this, type)).catch(err => {
        const prettyError = rewordError(err);
        if (prettyError) {
            return this.response.status(500).send(prettyError);
        }
        throw err;
    });
};

/**
 * Handles parsing the retrieved document
 * @param {String} type Type of data to retrieve
 * @param {} res Response from server
 * @returns {Array<Array>} Parsed data
 */
BerkeleyEarth._extractData = function(type, res) {
    let lines = res.split('\n');
    let data = [];
    
    // Validate data type
    if(Object.keys(dataColumns).indexOf(type) === -1){
        return this.response.status(500).send('Invalid data type requested');
    }

    const dataColumn = dataColumns[type];

    for (let line of lines) {
        // Skip comments and empty lines
        if (line.length < 1 || line.startsWith('%')) {
            continue;
        }
        let parts = line.trim().split(/\s+/);
        if (parts.length < 10 || parts[dataColumn] == 'NaN') {
            continue;
        }
        data.push([parseInt(parts[0]) + parseInt(parts[1]) / 12, parts[dataColumn]]);
    }
    return data;
};

module.exports = BerkeleyEarth;
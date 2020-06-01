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
const BerkeleyEarth = new ApiConsumer('BerkeleyEarth', 'http://berkeleyearth.lbl.gov/auto/', { cache: { ttl: 60 * 60 * 24 * 30 } });
const rewordError = err => {
    if (err.statusCode === 404) {
        return 'Unknown country or region';
    }
};

/**
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
 * @returns {Array} Current price for the specified stock
 */
BerkeleyEarth.monthlyAnomaly = function (country) {
    country = country.toLowerCase();

    const options = {
        path: `Regional/TAVG/Text/${country}-TAVG-Trend.txt`,
        queryString: 'displayPercent=true',
    };

    // Check for special region names
    if(Object.keys(regionsDictionary).indexOf(country) !== -1){
        options.path = regionsDictionary[country];
    }

    return this._requestData(options).then(res => {
        // Parse data file        
        let lines = res.split('\n');
        let data = [];

        for (let line of lines){
            // Skip comments and empty lines
            if(line.length < 1 || line.startsWith('%')){
                continue;
            }

            let parts = line.trim().split(/ +/);
            if (parts.length < 10 || parts[2] == 'NaN'){
                continue;
            }

            data.push([parts[0], parts[1], parts[2]]);
        }

        return data;
    }).catch(err => {
        const prettyError = rewordError(err);
        if (prettyError) {
            return this.response.status(500).send(prettyError);
        }
        throw err;
    });
};

module.exports = BerkeleyEarth;

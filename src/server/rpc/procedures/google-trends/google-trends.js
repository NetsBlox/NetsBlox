/**
 * The GoogleTrends Service provides access to the current Google trends.
 * For more information, check out https://trends.google.com/trends/.
 * @service
 */
const TrendsRPC = {};

const logger = require('../utils/logger')('google-trends');
const request = require('request');
const googleTrends = require('google-trends-api');
const CacheManager = require('cache-manager');

var countryInfoBaseUrl = 'http://api.geonames.org/countryCodeJSON?',
    cache = CacheManager.caching({store: 'memory', max: 1000, ttl: 36000}),
    geoNamesUsername = process.env.GOOGLE_TRENDS_USERNAME || 'hamidzr';

/**
 * Get trends information at a location
 * @param {Latitude} latitude Latitude of location
 * @param {Longitude} longitude Longitude of location
 */
TrendsRPC.byLocation = function (latitude, longitude) {
    // get location data eg: country, language
    // or we can use geocoder package
    let url = `${countryInfoBaseUrl}radius=${50}&lat=${latitude}&lng=${longitude}&username=${geoNamesUsername}`,
        response = this.response;

    logger.trace('Requesting country data from ', url);
    request(url, (err, res, body) => {
        if (err) {
            logger.error('Could not request country data', err);
            return response.status(500).send('ERROR: ' + err);
        }
        let countryInfo = JSON.parse(body);
        logger.trace('detected country: ', countryInfo.countryName, countryInfo, 'long', longitude, 'lat', latitude);
        if (typeof countryInfo.countryCode != 'undefined') {
            // Improve: google does not use official country codes for trends see VN vs VE
            TrendsRPC.byCountryCode.call(this, countryInfo.countryCode);
        } else {
            showError('Failed to detect the country.', response);
        }
    }); // end of request

    return null;  // explicitly return null since async
};

/**
 * Get trends information for a country
 * @param {String} countryCode Abbreviation of country to search
 */
TrendsRPC.byCountryCode = function (countryCode) {
    let response = this.response;

    // assumption: first callback is called when there is nochaed value for the id
    countryCode = countryCode.toUpperCase();
    cache.wrap(countryCode, cacheCallback => {
        // Get the trends -> not in cache!
        logger.trace('this request is not cached, requesting googleTrends for : ', countryCode);
        googleTrends.hotTrends(countryCode)
            .then((trendsArr) => {
                return trendsArr.slice(0, 10);
            })
            .then((results) => {
                logger.trace(results);
                return cacheCallback(null, results);
            })
            .catch((err) => {
                logger.error(err);
                return cacheCallback(null, `No trends available for ${countryCode}`);
            });
    }, (err, results) => {
        // Send the response to the user
        logger.trace('sending the response');
        response.json(results);
        logger.trace('Sent the response!');
    });

    return null;  // explicitly return null since async
};

function showError(err, response) {
    response.json(err);
}

module.exports = TrendsRPC;

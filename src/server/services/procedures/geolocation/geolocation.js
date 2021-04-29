/**
 * The Geolocation Service provides access to the Google Places API and geocoding capabilities.
 * For more information, check out https://developers.google.com/places/
 *
 * Terms of service: https://developers.google.com/maps/terms
 * @service
 */
const {GoogleMapsKey} = require('../utils/api-key');
const utils = require('../utils');
const GeoLocationRPC = {};
utils.setRequiredApiKey(GeoLocationRPC, GoogleMapsKey);
const logger = require('../utils/logger')('geolocation');

const CacheManager = require('cache-manager');
const NodeGeocoder = require('node-geocoder');
const rp = require('request-promise');
const jsonQuery = require('json-query');

// init
var cache = CacheManager.caching({store: 'memory', max: 1000, ttl: 36000}),
    GEOCODER_API = process.env.GOOGLE_GEOCODING_API,
    geocoder = NodeGeocoder({
        provider: 'google',
        httpAdapter: 'https', // Default
        apiKey: GEOCODER_API, // for Mapquest, OpenCage, Google Premier
        formatter: null         // 'gpx', 'string', ...
    });

// turns coordinates into key strings used to bust the match new requests to cached responses
// might be a good idea to add a precision limit to reduce cache misses
let coordsToCacheKey = (lat, long) => {
    return lat + ', ' + long;
};

// helper to filter json down
function queryJson(json, query){
    let res =  jsonQuery(query, {data: json}).value;
    if (typeof(res) === 'object') {
        res = JSON.stringify(res);
    }
    return res;
}

// reverse geocoding helper, doesn't return a promise. handles sending of response.
let reverseGeocode = (lat, lon, response, query)=>{
    cache.wrap(coordsToCacheKey(lat, lon) + query, cacheCallback => {
        logger.trace('Geocoding (not cached)', lat, lon);
        geocoder.reverse({lat, lon})
            .then(function(res) {
                // only interested in the first match
                res = queryJson(res[0], query);
                if (res === null) return cacheCallback('not found', null);
                // send the response to user
                return cacheCallback(null, res);
            })
            .catch((err) => {
                logger.error(err);
                return cacheCallback('Error in reverse geocoding', null);
            });
    }, (err, results) => {
        if(results){
            logger.trace('answering with',results);
            response.send(results);
        } else {
            showError(err, response);
        }
    });
};


/**
 * Geolocates the address and returns the coordinates
 * @param {String} address target address
 * @returns {Object} structured data representing the location of the address
 */
GeoLocationRPC.geolocate = function (address) {
    let response = this.response;

    logger.trace('Geocoding', address);
    return cache.wrap(address, () => {
        return geocoder.geocode(address)
            .then(function(res) {
                logger.trace(res);
                return [['latitude', res[0].latitude], ['longitude', res[0].longitude]];
            });
    })
        .catch(function(err) {
            logger.error('Error in geocoding', err);
            showError('Failed to geocode',response);
        });
};

/**
 * Get the name of the city nearest to the given latitude and longitude.
 *
 * @param {Latitude} latitude latitude of the target location
 * @param {Longitude} longitude longitude of the target location
 * @returns {String} city name
 */
GeoLocationRPC.city = function (latitude, longitude) {
    reverseGeocode(latitude, longitude, this.response, '.city');
    return null;
};

/**
 * Get the name of the county (or closest equivalent) nearest to the given latitude and longitude.
 * If the country does not have counties, it will return the corresponding division for administrative level 2.
 *
 * For more information on administrative divisions, check out https://en.wikipedia.org/wiki/List_of_administrative_divisions_by_country
 *
 * @param {Latitude} latitude latitude of the target location
 * @param {Longitude} longitude longitude of the target location
 * @returns {String} county name
 */
GeoLocationRPC['county*'] = function (latitude, longitude) {
    reverseGeocode(latitude, longitude, this.response, '.administrativeLevels.level2long');
    return null;
};

/**
 * Get the name of the state (or closest equivalent) nearest to the given latitude and longitude.
 * If the country does not have states, it will return the corresponding division for administrative level 1.
 *
 * For more information on administrative divisions, check out https://en.wikipedia.org/wiki/List_of_administrative_divisions_by_country
 *
 * @param {Latitude} latitude latitude of the target location
 * @param {Longitude} longitude longitude of the target location
 * @returns {String} state name
 */
 GeoLocationRPC['state*'] = function (latitude, longitude) {
    reverseGeocode(latitude, longitude, this.response, '.administrativeLevels.level1long');
    return null;
};

/**
 * Get the code for the state (or closest equivalent) nearest to the given latitude and longitude.
 * If the country does not have states, it will return the corresponding division for administrative level 1.
 *
 * For more information on administrative divisions, check out https://en.wikipedia.org/wiki/List_of_administrative_divisions_by_country
 *
 * @param {Latitude} latitude latitude of the target location
 * @param {Longitude} longitude longitude of the target location
 * @returns {String} state name
 */
GeoLocationRPC['stateCode*'] = function (latitude, longitude) {
    reverseGeocode(latitude, longitude, this.response, '.administrativeLevels.level1short');
    return null;
};

/**
 * Get the name of the country nearest to the given latitude and longitude.
 *
 * @param {Latitude} latitude latitude of the target location
 * @param {Longitude} longitude longitude of the target location
 * @returns {String} country name
 */
GeoLocationRPC.country = function (latitude, longitude) {
    reverseGeocode(latitude, longitude, this.response, '.country');
    return null;
};

/**
 * Get the code for the country nearest to the given latitude and longitude.
 *
 * @param {Latitude} latitude latitude of the target location
 * @param {Longitude} longitude longitude of the target location
 * @returns {String} country name
 */
GeoLocationRPC.countryCode = function (latitude, longitude) {
    reverseGeocode(latitude, longitude, this.response, '.countryCode');
    return null;
};

/**
 * Get administrative division information for the given latitude and longitude.
 *
 * @param {Latitude} latitude latitude of the target location
 * @param {Longitude} longitude longitude of the target location
 */
GeoLocationRPC.info = function (latitude, longitude) {
    return geocoder.reverse({lat: latitude, lon: longitude})
        .then( res => {
            let levels = [];
            res = res[0]; // we only care about the top result
            // find and pull out all the provided admin levels
            levels.push(res.city);
            Object.keys(res.administrativeLevels).forEach(lvl => {
                levels.push(res.administrativeLevels[lvl]);
            });
            levels.push(res.country);
            levels.push(res.countryCode);
            levels = levels.reverse(); // reverse so that it's big to small
            return levels;
        }).catch(err => {
            logger.error(err);
            throw(err);
        });
};

/**
 * Find places near an earth coordinate (latitude, longitude) (maximum of 10 results)
 * @param {Latitude} latitude
 * @param {Longitude} longitude
 * @param {String=} keyword the keyword you want to search for, like pizza or cinema.
 * @param {Number=} radius search radius in meters (50km)
 */
GeoLocationRPC.nearbySearch = function (latitude, longitude, keyword, radius) {
    radius = radius || 50000; // default to 50KM

    let requestOptions = {
        method: 'get',
        uri: 'https://maps.googleapis.com/maps/api/place/nearbysearch/json',
        qs: {
            location: latitude + ',' + longitude,
            radius: radius,
            // rankby: 'distance',
            key: this.apiKey.value
        },
        json: true
    };

    if (keyword) {
        requestOptions.qs.keyword = keyword;
    }

    return cache.wrap(coordsToCacheKey(latitude, longitude) + keyword + radius, async () => {
        const res = await rp(requestOptions);
        if (res.error_message) {
            throw new Error(res.error_message);
        }
        const places = res.results;
        // keep the 10 best results
        const topResults = places.slice(0, 10)
            .map(place => [
                ['latitude', place.geometry.location.lat],
                ['longitude', place.geometry.location.lng],
                ['name', place.name],
                ['types', place.types],
            ]);
        return topResults;
    });
};

function showError(err, response) {
    // if we can't answer their question return snap null
    response.send('null');
}

module.exports = GeoLocationRPC;

/**
 * The AirQuality Service provides access to real-time air quality data using the AirNowAPI.
 * For more information, check out https://docs.airnowapi.org/.
 * @service
 * @category Science
 */
'use strict';

const ApiConsumer = require('../utils/api-consumer');
const {AirNowKey} = require('../utils/api-key');

const logger = require('../utils/logger')('air-quality'),
    path = require('path'),
    fs = require('fs'),
    geolib = require('geolib');

const AirConsumer = new ApiConsumer('AirQuality', 'http://www.airnowapi.org/aq/observation/zipCode/current/',{cache: {ttl: 30*60}});
ApiConsumer.setRequiredApiKey(AirConsumer, AirNowKey);

var reportingLocations = (function() {  // Parse csv
    var locationPath = path.join(__dirname, 'air-reporting-locations.csv'),
        text = fs.readFileSync(locationPath, 'utf8'),
        rawLocations = text.split('\n');

    rawLocations.pop();  // Remove trailing \n
    rawLocations.shift();  // Remove header
    return rawLocations
        .map(function(line) {
            var data = line.split('|');
            return {
                city: data[0],
                state: data[1],
                zipcode: data[2],
                latitude: +data[3],
                longitude: +data[4]
            };
        });
})();

/**
 * Get ZIP code of closest reporting location for coordinates
 * @param {Latitude} latitude latitude of location
 * @param {Longitude} longitude Longitude of location
 * @returns {Number} ZIP code of closest location
 */
AirConsumer._getClosestReportingLocation = function(latitude, longitude) {
    var nearest = geolib.findNearest({latitude: latitude, longitude: longitude}, reportingLocations),
        city = reportingLocations[nearest.key].city,
        state = reportingLocations[nearest.key].state,
        zipcode = reportingLocations[nearest.key].zipcode;
    logger.trace('Nearest reporting location is ' + city + ', ' + state);
    return zipcode;
};

/**
 * Get air quality index of closest reporting location for coordinates
 * @param {Latitude} latitude latitude of location
 * @param {Longitude} longitude Longitude of location
 * @returns {Number} AQI of closest station
 */
AirConsumer.qualityIndex = function(latitude, longitude) {
    var nearest = this._getClosestReportingLocation(latitude, longitude);

    logger.trace(`Requesting air quality at ${latitude}, ${longitude} (nearest station: ${nearest})`);

    return this.qualityIndexByZipCode(nearest);
};

/**
 * Get air quality index of closest reporting location for ZIP code
 * @param {BoundedNumber<0,99999>} zipCode ZIP code of location
 * @returns {Number} AQI of closest station
 */
AirConsumer.qualityIndexByZipCode = function(zipCode) {
    const queryString = `?format=application/json&API_KEY=${this.apiKey.value}&zipCode=${zipCode}`;

    logger.trace(`Requesting air quality at ${zipCode}`);

    return this._sendAnswer({queryString}, '.AQI')
        .then((r) => (r.length > 0? r[0]: -1));
};

/**
 * Get air quality index of closest reporting location for coordinates
 * @param {Latitude} latitude latitude of location
 * @param {Longitude} longitude Longitude of location
 * @returns {Number} AQI of closest station
 * @deprecated
 */
AirConsumer.aqi = function(latitude, longitude) {
    // For backwards compatibility, RPC had duplicate methods
    return this.qualityIndex(latitude, longitude);
};

AirConsumer.COMPATIBILITY = {
    path: 'air',
    arguments: {
        aqi: {
            latitude: 'lat',
            longitude: 'lng'
        }
    }
};

module.exports = AirConsumer;

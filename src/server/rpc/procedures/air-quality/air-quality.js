/**
 * The AirQuality Service provides access to real-time air quality data using the AirNowAPI.
 * For more information, check out https://docs.airnowapi.org/.
 * @service
 */

// This will use the AirNowAPI to get air quality given a latitude and longitude.
// If we start to run out of API requests, they have the entire dataset available
// for download online.
'use strict';

const ApiConsumer = require('../utils/api-consumer');

var debug = require('debug'),
    error = debug('netsblox:rpc:air-quality:error'),
    trace = debug('netsblox:rpc:air-quality:trace'),
    API_KEY = process.env.AIR_NOW_KEY,
    path = require('path'),
    fs = require('fs'),
    geolib = require('geolib');

const AirConsumer = new ApiConsumer('air-quality', `http://www.airnowapi.org/aq/observation/zipCode/current/?format=application/json&API_KEY=${API_KEY}`,{cache: {ttl: 30*60}});

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
    trace('Nearest reporting location is ' + city + ', ' + state);
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

    trace(`Requesting air quality at ${latitude}, ${longitude} (nearest station: ${nearest})`);

    return this.qualityIndexByZip(nearest);
};

/**
 * Get air quality index of closest reporting location for ZIP code
 * @param {BoundedNumber<0,99999>} zipCode ZIP code of location
 * @returns {Number} AQI of closest station
 */
AirConsumer.qualityIndexByZip = function(zipCode) {

    trace(`Requesting air quality at ${zipCode}`);

    return this._sendAnswer({queryString: `&zipCode=${zipCode}`}, '.AQI')
    .catch(err => {
        
        error('Could not get air quality index: ', err);
        
        throw err;
    }).then((r) => (r.length > 0? r[0]: -1));    
};

/**
 * Get air quality index of closest reporting location for coordinates
 * @param {Latitude} latitude latitude of location
 * @param {Longitude} longitude Longitude of location
 * @returns {Number} AQI of closest station
 */
AirConsumer.aqi = function(latitude, longitude) {
    // For backwards compatibility, RPC had duplicate methods
    return this.qualityIndex(latitude, longitude);
};

AirConsumer.serviceName = 'AirQuality';

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

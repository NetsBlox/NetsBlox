/**
 * The AirQuality Service provides access to real-time air quality data using the AirNowAPI.
 * For more information, check out https://docs.airnowapi.org/.
 * @service
 */

// This will use the AirNowAPI to get air quality given a latitude and longitude.
// If we start to run out of API requests, they have the entire dataset available
// for download online.
'use strict';

const logger = require('../utils/logger')('air-quality');
const API_KEY = process.env.AIR_NOW_KEY;
const path = require('path');
const fs = require('fs');
const geolib = require('geolib');
const request = require('request');

var baseUrl = 'http://www.airnowapi.org/aq/forecast/zipCode/?format=application/' + 
        'json&API_KEY=' + API_KEY,
    reportingLocations = (function() {  // Parse csv
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


var getClosestReportingLocation = function(latitude, longitude) {
    var nearest = geolib.findNearest({latitude: latitude, longitude: longitude}, reportingLocations),
        city = reportingLocations[nearest.key].city,
        state = reportingLocations[nearest.key].state,
        zipcode = reportingLocations[nearest.key].zipcode;
    logger.trace('Nearest reporting location is ' + city + ', ' + state);
    return zipcode;
};

/**
 * Get air quality index at a location 
 * @param {Latitude} latitude Latitude
 * @param {Longitude} longitude Longitude
 * @returns {String} ZIP code of closest reporting location
 */
var qualityIndex = function(latitude, longitude) {
    var response = this.response,
        nearest,
        url;

    logger.trace(`Requesting air quality at ${latitude}, ${longitude}`);
    if (!latitude || !longitude) {
        return response.status(400).send('ERROR: missing latitude or longitude');
    }

    nearest = getClosestReportingLocation(latitude, longitude);
    url = baseUrl + '&zipCode=' + nearest;

    logger.trace('Requesting air quality at '+ nearest);
    
    request(url, (err, res, body) => {
        var aqi = -1,
            code = err ? 500 : res.statusCode;

        try {
            body = JSON.parse(body).shift();
            if (body && body.AQI) {
                aqi = +body.AQI;
                logger.trace('Air quality at '+ nearest + ' is ' + aqi);
            }
        } catch (e) {
            // Just send -1 if anything bad happens
            logger.error('Could not get air quality index: ', e);
        }

        response.status(code).json(aqi);
    });

    return null;
};

module.exports = {
    COMPATIBILITY: {
        path: 'air',
        arguments: {
            aqi: {
                latitude: 'lat',
                longitude: 'lng'
            }
        }
    },

    // air quality index
    // Return -1 if unknown
    aqi: qualityIndex,
    qualityIndex: qualityIndex
};


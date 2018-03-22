/**
 * The AirQuality Service provides access to real-time air quality data using the AirNowAPI.
 * For more information, check out https://docs.airnowapi.org/.
 * @service
 */

// This will use the AirNowAPI to get air quality given a latitude and longitude.
// If we start to run out of API requests, they have the entire dataset available
// for download online.
'use strict';

var debug = require('debug'),
    error = debug('netsblox:rpc:air-quality:error'),
    trace = debug('netsblox:rpc:air-quality:trace'),
    API_KEY = process.env.AIR_NOW_KEY,
    path = require('path'),
    fs = require('fs'),
    geolib = require('geolib'),
    request = require('request');

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


var getClosestReportingLocation = function(lat, lng) {
    var nearest = geolib.findNearest({latitude: lat, longitude: lng}, reportingLocations),
        city = reportingLocations[nearest.key].city,
        state = reportingLocations[nearest.key].state,
        zipcode = reportingLocations[nearest.key].zipcode;
    trace('Nearest reporting location is ' + city + ', ' + state);
    return zipcode;
};

var qualityIndex = function(latitude, longitude) {
    var response = this.response,
        nearest,
        url;

    trace(`Requesting air quality at ${latitude}, ${longitude}`);
    if (!latitude || !longitude) {
        return response.status(400).send('ERROR: missing latitude or longitude');
    }

    nearest = getClosestReportingLocation(latitude, longitude);
    url = baseUrl + '&zipCode=' + nearest;

    trace('Requesting air quality at '+ nearest);
    
    request(url, (err, res, body) => {
        var aqi = -1,
            code = err ? 500 : res.statusCode;

        try {
            body = JSON.parse(body).shift();
            if (body && body.AQI) {
                aqi = +body.AQI;
                trace('Air quality at '+ nearest + ' is ' + aqi);
            }
        } catch (e) {
            // Just send -1 if anything bad happens
            error('Could not get air quality index: ', e);
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

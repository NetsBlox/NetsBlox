// This will use the Seismi API to populate a list of recent earthquakes. All queries
// will then be handled wrt this list stored in the filesystem. Hourly, we will update
// our cache of this earthquake data.
//
// This is a static rpc collection. That is, it does not maintain state and is 
// shared across groups
'use strict';

var debug = require('debug'),
    log = debug('NetsBlox:RPCManager:Earthquakes.js:log'),
    error = debug('NetsBlox:RPCManager:Earthquakes.js:error'),
    trace = debug('NetsBlox:RPCManager:Earthquakes.js:trace'),
    API_KEY = process.env.AIR_NOW_KEY,
    path = require('path'),
    fs = require('fs'),
    geolib = require('geolib'),
    request = require('request');

//var baseUrl = 'http://www.airnowapi.org/aq/forecast/latLong/?format=application/' + 
        //'json&API_KEY=' + API_KEY,
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


var updateCache = function() {
    //request(url, function(err, response, body) {
        //if (err) {
            //return res.status(500).send('ERROR: '+err);
        //}
        //// TODO
    //});
};

module.exports = {

    // This is very important => Otherwise it will try to instantiate this
    isStateless: true,

    // These next two functions are the same from the stateful RPC's
    getPath: function() {
        return '/earthquakes';
    },

    getActions: function() {
        // TODO
        return [];
    },

    earthquakes: function(req, res) {
        // TODO
    }
};

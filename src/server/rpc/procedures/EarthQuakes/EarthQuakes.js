// This will use the Seismi API to populate a list of recent earthquakes. All queries
// will then be handled wrt this list stored in the filesystem. Hourly, we will update
// our cache of this earthquake data.
//
// This is a static rpc collection. That is, it does not maintain state and is 
// shared across groups
'use strict';

var debug = require('debug'),
    log = debug('NetsBlox:RPCManager:Earthquakes:log'),
    error = debug('NetsBlox:RPCManager:Earthquakes:error'),
    trace = debug('NetsBlox:RPCManager:Earthquakes:trace'),
    path = require('path'),
    fs = require('fs'),
    R = require('ramda'),
    geolib = require('geolib'),
    request = require('request');

var baseUrl = 'http://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&';
    //minlatitude=30&maxlatitude=40&minlongitude=-90&maxlongitude=-75';

var createParams = function(obj) {
    return R.toPairs(obj)
        .map(keyVal => keyVal.join('='))
        .join('&');
};

module.exports = {

    // This is very important => Otherwise it will try to instantiate this
    isStateless: true,

    // These next two functions are the same from the stateful RPC's
    getPath: function() {
        return '/earthquakes';
    },

    getActions: function() {
        return ['byRegion'];
    },

    byRegion: function(req, res) {
        var params = createParams({
                minlatitude: +req.query.minlat || 0,
                minlongitude: +req.query.minlng || 0,
                maxlatitude: +req.query.maxlat || 0,
                maxlongitude: +req.query.maxlng || 0
            }),
            url = baseUrl + params;

        trace('Requesting earthquakes at : ' + params);

        // This method will not respond with anything... It will simply
        // trigger socket messages to the given client
        request(url, function(err, response, body) {
            if (err) {
                res.serverError(err);
            }
            log('Found ' + JSON.parse(body).metadata.count + ' earthquakes');
            res.sendStatus(200);

            var earthquakes = [],
                socket = req.netsbloxSocket,  // Get the websocket for network messages
                msg;

            try {
                earthquakes = JSON.parse(body).features;
            } catch (e) {
                log('Could not parse earthquakes (returning empty array): ' + e);
            }

            for (var i = earthquakes.length; i--;) {
                // For now, I will send lat, lng, size, date
                msg = [
                    'message',
                    socket._seatId,
                    'rpc',
                    'Earthquake',
                    JSON.stringify({
                        latitude: earthquakes[i].geometry.coordinates[1],
                        longitude: earthquakes[i].geometry.coordinates[0],
                        size: earthquakes[i].properties.mag,
                        time: earthquakes[i].properties.time
                    })
                ].join(' ');
                socket.send(msg);
            }
        });
    }
};

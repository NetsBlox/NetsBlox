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
    request = require('request'),
    baseUrl = 'http://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&',
    Constants = require('../../../../common/Constants'),
    remainingMsgs = {};

// Helpers
var createParams = function(obj) {
    return R.toPairs(obj)
        .map(keyVal => keyVal.join('='))
        .join('&');
};

var DELAY = 250;
var sendNext = function(socket) {
    var msgs = remainingMsgs[socket.uuid];
    if (msgs) {
        // send an earthquake message
        var msg = msgs.shift();

        while (msgs.length && msg.dstId !== socket.roleId) {
            msg = msgs.shift();
        }

        // check the roleId
        if (msg.dstId === socket.roleId) {
            socket.send(msg);
        }

        if (msgs.length) {
            setTimeout(sendNext, DELAY, socket);
        } else {
            delete remainingMsgs[socket.uuid];
        }
    }
};

// RPC
module.exports = {

    // This is very important => Otherwise it will try to instantiate this
    isStateless: true,

    // These next two functions are the same from the stateful RPC's
    getPath: function() {
        return '/earthquakes';
    },

    getActions: function() {
        return ['byRegion', 'stop'];
    },

    stop: function(req, res) {
        var uuid = req.netsbloxSocket.uuid;
        delete remainingMsgs[uuid];
        res.sendStatus(200);
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
                res.status(500).send('ERROR: ' + err);
                return;
            }

            try {
                body = JSON.parse(body);
            } catch (e) {
                error('Received non-json: ' + body);
                return res.status(500).send('ERROR: could not retrieve earthquakes');
            }

            log('Found ' + body.metadata.count + ' earthquakes');
            res.sendStatus(200);

            var earthquakes = [],
                socket = req.netsbloxSocket,  // Get the websocket for network messages
                msg;

            try {
                earthquakes = body.features;
            } catch (e) {
                log('Could not parse earthquakes (returning empty array): ' + e);
            }

            var msgs = [];
            for (var i = earthquakes.length; i--;) {
                // For now, I will send lat, lng, size, date
                msg = {
                    type: 'message',
                    dstId: socket.roleId,
                    msgType: 'Earthquake',
                    content: {
                        latitude: earthquakes[i].geometry.coordinates[1],
                        longitude: earthquakes[i].geometry.coordinates[0],
                        size: earthquakes[i].properties.mag,
                        time: earthquakes[i].properties.time
                    }
                };
                msgs.push(msg);
            }
            remainingMsgs[socket.uuid] = msgs;
            sendNext(socket);
        });
    }
};

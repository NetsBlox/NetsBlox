// This will use the Seismi API to populate a list of recent earthquakes. All queries
// will then be handled wrt this list stored in the filesystem. Hourly, we will update
// our cache of this earthquake data.
//
// This is a static rpc collection. That is, it does not maintain state and is 
// shared across groups
'use strict';

var debug = require('debug'),
    log = debug('netsblox:rpc:earthquakes:log'),
    error = debug('netsblox:rpc:earthquakes:error'),
    trace = debug('netsblox:rpc:earthquakes:trace'),
    R = require('ramda'),
    request = require('request'),
    baseUrl = 'http://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&';

// Helpers
var createParams = function(obj) {
    return R.toPairs(obj)
        .map(keyVal => keyVal.join('='))
        .join('&');
};

var DELAY = 250;
var Earthquakes = {};
Earthquakes._remainingMsgs = {};

Earthquakes._sendNext = function(socket) {
    var msgs = Earthquakes._remainingMsgs[socket.uuid];
    if (msgs && msgs.length) {
        // send an earthquake message
        var msg = msgs.shift();

        while (msgs.length && msg.dstId !== socket.roleId) {
            msg = msgs.shift();
        }

        // check that the socket is still at the role receiving the messages
        if (msg && msg.dstId === socket.roleId) {
            socket.send(msg);
        }

        if (msgs.length) {
            setTimeout(Earthquakes._sendNext, DELAY, socket);
        } else {
            delete Earthquakes._remainingMsgs[socket.uuid];
        }
    } else {
        delete Earthquakes._remainingMsgs[socket.uuid];
    }
};

// This is very important => Otherwise it will try to instantiate this
Earthquakes.isStateless = true;

// These next two functions are the same from the stateful RPC's
Earthquakes.getPath = function() {
    return '/earthquakes';
};

Earthquakes.stop = function() {
    var uuid = this.socket.uuid;
    delete Earthquakes._remainingMsgs[uuid];
    return '';
};

Earthquakes.byRegion = function(minLatitude, maxLatitude, minLongitude, maxLongitude) {
    var socket = this.socket,
        response = this.response,
        params = createParams({
            minlatitude: +minLatitude || 0,
            minlongitude: +minLongitude || 0,
            maxlatitude: +maxLatitude || 0,
            maxlongitude: +maxLongitude || 0
        }),
        url = baseUrl + params;

    trace('Requesting earthquakes at : ' + params);

    // This method will not respond with anything... It will simply
    // trigger socket messages to the given client
    request(url, function(err, res, body) {
        if (err) {
            response.status(500).send('ERROR: ' + err);
            return;
        }

        try {
            body = JSON.parse(body);
        } catch (e) {
            error('Received non-json: ' + body);
            return response.status(500).send('ERROR: could not retrieve earthquakes');
        }

        log('Found ' + body.metadata.count + ' earthquakes');
        response.sendStatus(200);

        var earthquakes = [],
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
        if (msgs.length) {
            Earthquakes._remainingMsgs[socket.uuid] = msgs;
            Earthquakes._sendNext(socket);
        }
    });
    return null;
};

module.exports = Earthquakes;

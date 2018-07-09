/**
 * The Earthquakes Service provides access to historical earthquake data.
 * For more information, check out https://earthquake.usgs.gov/.
 * @service
 */
// This will use the Seismi API to populate a list of recent earthquakes. All queries
// will then be handled wrt this list stored in the filesystem. Hourly, we will update
// our cache of this earthquake data.
//
// This is a static rpc collection. That is, it does not maintain state and is
// shared across groups
'use strict';

const logger = require('../utils/logger')('earthquakes');
var moment = require('moment'),
    R = require('ramda'),
    request = require('request'),
    baseUrl = 'http://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&';

// Helpers
var createParams = function(obj) {
    return R.toPairs(obj)
        .filter(keyVal => keyVal[1] != null )
        .map(keyVal => keyVal.join('='))
        .join('&');
};

let stringToDate = string => {
    if (string.match(/^\d+$/)) {
        return new Date(parseInt(string));
    }
    return new Date(string);
};

var DELAY = 250;
var Earthquakes = {};
Earthquakes._remainingMsgs = {};

Earthquakes._sendNext = function(socket) {
    var msgs = Earthquakes._remainingMsgs[socket.uuid];
    if (msgs && msgs.length) {
        // send an earthquake message
        var msg = msgs.shift();

        while (msgs.length && msg.dstId !== socket.role) {
            msg = msgs.shift();
        }

        // check that the socket is still at the role receiving the messages
        if (msg && msg.dstId === socket.role) {
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

/**
 * Stop sending earthquake messages
 */
Earthquakes.stop = function() {
    var uuid = this.socket.uuid;
    delete Earthquakes._remainingMsgs[uuid];
    return '';
};


/**
 * Get the current price of the given stock, with a 15 min delay
 * @param {Latitude=} minLatitude Minimum latitude of region
 * @param {Latitude=} maxLatitude Maximum latitude of region
 * @param {Longitude=} minLongitude Minimum longitude of region
 * @param {Longitude=} maxLongitude Maximum longitude of region
 * @param {String=} startTime Minimum time
 * @param {String=} endTime Maximum time
 * @param {Number=} minMagnitude Minimum magnitude of earthquakes to report
 * @param {Number=} maxMagnitude Maximum magnitude of earthquakes to report
 */
Earthquakes.byRegion = function(minLatitude, maxLatitude, minLongitude, maxLongitude, startTime, endTime, minMagnitude, maxMagnitude) {
    var socket = this.socket,
        response = this.response,
        options = {
            minlatitude: +minLatitude || 0,
            minlongitude: +minLongitude || 0,
            maxlatitude: +maxLatitude || 0,
            maxlongitude: +maxLongitude || 0,
            starttime: startTime ? stringToDate(startTime).toISOString() : moment().subtract(30, 'days').toDate().toISOString(),
            endtime: endTime ? stringToDate(endTime).toISOString() : new Date().toISOString(),
            minmagnitude: minMagnitude || null,
            maxmagnitude: maxMagnitude || null
        };
    let params = createParams(options);
    let url = baseUrl + params;

    logger.trace('Requesting earthquakes at : ' + url);

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
            logger.error('Received non-json: ' + body);
            return response.status(500).send('ERROR: could not retrieve earthquakes');
        }

        logger.trace('Found ' + body.metadata.count + ' earthquakes');
        response.send('Sending ' + body.metadata.count + ' earthquake messages');

        var earthquakes = [],
            msg;

        try {
            earthquakes = body.features;
        } catch (e) {
            logger.log('Could not parse earthquakes (returning empty array): ' + e);
        }

        var msgs = [];
        for (var i = earthquakes.length; i--;) {
            // For now, I will send lat, lng, size, date
            msg = {
                type: 'message',
                dstId: socket.role,
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

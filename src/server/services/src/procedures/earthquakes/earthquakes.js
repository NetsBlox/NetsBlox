/**
 * The Earthquakes Service provides access to historical earthquake data.
 * For more information, check out https://earthquake.usgs.gov/.
 *
 * @service
 * @category Science
 */
'use strict';

const logger = require('../utils/logger')('earthquakes');
var moment = require('moment'),
    _ = require('lodash'),
    request = require('request'),
    baseUrl = 'http://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&';

// Helpers
var createParams = function(obj) {
    return _.toPairs(obj)
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

const DELAY = 250;
const Earthquakes = {};
Earthquakes._remainingMsgs = {};

Earthquakes._sendNext = function(socket) {
    const {clientId} = socket;
    const msgs = Earthquakes._remainingMsgs[clientId];
    if (msgs && msgs.length) {
        socket.sendMessage('Earthquake', msgs.shift());

        if (msgs.length) {
            setTimeout(Earthquakes._sendNext, DELAY, socket);
        } else {
            delete Earthquakes._remainingMsgs[clientId];
        }
    } else {
        delete Earthquakes._remainingMsgs[clientId];
    }
};

/**
 * Stop sending earthquake messages
 */
Earthquakes.stop = function() {
    const {clientId} = this.caller;
    delete this._remainingMsgs[clientId];
    return '';
};


/**
 * Send messages for earthquakes within a given region
 * @param {Latitude} minLatitude Minimum latitude of region
 * @param {Latitude} maxLatitude Maximum latitude of region
 * @param {Longitude} minLongitude Minimum longitude of region
 * @param {Longitude} maxLongitude Maximum longitude of region
 * @param {String=} startTime Minimum time
 * @param {String=} endTime Maximum time
 * @param {Number=} minMagnitude Minimum magnitude of earthquakes to report
 * @param {Number=} maxMagnitude Maximum magnitude of earthquakes to report
 */
Earthquakes.byRegion = function(minLatitude, maxLatitude, minLongitude, maxLongitude, startTime, endTime, minMagnitude, maxMagnitude) {
    const {clientId} = this.caller;
    var response = this.response,
        options = {
            minlatitude: minLatitude,
            minlongitude: minLongitude,
            maxlatitude: maxLatitude,
            maxlongitude: maxLongitude,
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
    request(url, (err, res, body) => {
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

        var earthquakes = [];

        try {
            earthquakes = body.features;
        } catch (e) {
            logger.log('Could not parse earthquakes (returning empty array): ' + e);
        }

        const msgs = earthquakes.map(quake => ({
            latitude: quake.geometry.coordinates[1],
            longitude: quake.geometry.coordinates[0],
            size: quake.properties.mag,
            time: quake.properties.time
        }));

        if (msgs.length) {
            Earthquakes._remainingMsgs[clientId] = msgs;
            Earthquakes._sendNext(this.socket);
        }
    });

    return null;
};

module.exports = Earthquakes;

/**
 * The Traffic Service provides access to real-time traffic data using the Bing Traffic API.
 * For more information, check out https://msdn.microsoft.com/en-us/library/hh441725.aspx
 * @service
 */

'use strict';

const Q = require('q');
const logger = require('../utils/logger')('traffic');
const {BingMapsKey, InvalidKeyError} = require('../utils/api-key');
const utils = require('../utils');
const request = require('request');
const baseUrl = 'http://dev.virtualearth.net/REST/v1/Traffic/Incidents/';
let pendingEventsFor = {};

// Helper function to send the messages to the client
var sendNext = function(socket) {
    const {clientId} = socket;
    const events = pendingEventsFor[clientId] || [];
    let event = events.shift();  // retrieve the first message

    while (events.length && event.roleId !== socket.roleId) {
        event = events.shift();
    }

    // check the roleId
    if (event && event.roleId === socket.roleId) {
        socket.sendMessage('Traffic', event.data);
    }

    if (events.length) {
        setTimeout(sendNext, 250, socket);
    } else {
        delete pendingEventsFor[clientId];
    }
};

const BingTraffic = {};
utils.setRequiredApiKey(BingTraffic, BingMapsKey);
BingTraffic.search = function(westLongitude, northLatitude, eastLongitude, southLatitude) {
    const boundingBox = [
        southLatitude,
        westLongitude,
        northLatitude,
        eastLongitude
    ];
    const url = baseUrl + boundingBox.join(',') + '?key=' + this.apiKey.value;
    const deferred = Q.defer();

    logger.trace(`Requesting traffic accidents in ${westLongitude},${northLatitude},${eastLongitude},${southLatitude}`);
    request(url, (err, res, body) => {

        if (err) {
            logger.warn(`Request failed: ${err.message}`);
            return deferred.reject(new Error(`Could not access API: ${err.message}`));
        }

        try {
            body = JSON.parse(body);
        } catch(e) {
            throw new Error('Invalid API response: ' + body);
        }

        if (body.statusCode == 400) {
            return deferred.reject(new Error('The area is too big! Try zooming in more.'));
        } else if (body.statusCode === 401) {
            return deferred.reject(new InvalidKeyError(this.apiKey));
        }

        const type = ['Accident', 'Congestion', 'Disabled Vehicle', 'Mass Transit', 'Miscellaneous',
            'Other', 'Planned Event', 'Road Hazard', 'Construction', 'Alert', 'Weather'];

        // build the list of traffic incidents
        if (body.resourceSets[0].estimatedTotal != 0) {
            const results = body.resourceSets[0].resources.map(resource => {
                return {
                    roleId: this.caller.roleId,
                    data: {
                        latitude: resource.point.coordinates[0],
                        longitude: resource.point.coordinates[1],
                        type: type[resource.type-1]
                    }
                };
            });

            pendingEventsFor[this.caller.clientId] = results;
        }
        sendNext(this.socket);
        this.response.sendStatus(200);
        deferred.resolve();
    });
    return deferred.promise;
};

BingTraffic.stop = function() {
    delete pendingEventsFor[this.caller.clientId];
    return 'stopped';
};

BingTraffic.COMPATIBILITY = {
    search: {
        southLatitude: 'southLat',
        northLatitude: 'northLat',
        eastLongitude: 'eastLng',
        westLongitude: 'westLng'
    }
};

module.exports = BingTraffic;


/**
 * The Traffic Service provides access to real-time traffic data using the Bing Traffic API.
 * For more information, check out https://msdn.microsoft.com/en-us/library/hh441725.aspx
 * @service
 */

'use strict';

const Q = require('q');
const logger = require('../utils/logger')('bing-traffic');
const {BingMapsKey, InvalidKeyError} = require('../utils/api-key');
const utils = require('../utils');
const axios = require('axios');
const baseUrl = 'http://dev.virtualearth.net/REST/v1/Traffic/Incidents/';
const pendingEventsFor = {};

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

/**
 * Search for traffic accidents in a given region. Results are sent as messages in the format:
 *
 * Message type: Traffic
 * fields: latitude, longitude, type
 *
 * @param {Longitude} westLongitude
 * @param {Latitude} northLatitude
 * @param {Longitude} eastLongitude
 * @param {Latitude} southLatitude
 */
BingTraffic.search = async function(westLongitude, northLatitude, eastLongitude, southLatitude) {
    const boundingBox = [
        southLatitude,
        westLongitude,
        northLatitude,
        eastLongitude
    ];
    const url = baseUrl + boundingBox.join(',') + '?key=' + this.apiKey.value;

    logger.trace(`Requesting traffic accidents in ${westLongitude},${northLatitude},${eastLongitude},${southLatitude}`);
    const response = await axios({url, method: 'GET'})
        .catch(err => {
            if (err.response.status === 401) {
                throw new InvalidKeyError(this.apiKey);
            } else if (err.response.status === 400) {
                // errorDetails (provided in err.response.data.errorDetails) is not very helpful since it can
                // reference a parameter that is unnamed - even in the HTTP request. This
                // could lead to more confusion, so we will just return a generic error
                // about invalid bounds.
                const message = 'An error occurred. Is the search region too large?';
                throw new Error(message);
            }
            throw err;
        });

    const type = ['Accident', 'Congestion', 'Disabled Vehicle', 'Mass Transit', 'Miscellaneous',
        'Other', 'Planned Event', 'Road Hazard', 'Construction', 'Alert', 'Weather'];

    // build the list of traffic incidents
    const [resourceSet] = body.resourceSets;
    let resultCount = 0;
    if (resourceSet.estimatedTotal != 0) {
        const results = resourceSet.resources.map(resource => ({
            roleId: this.caller.roleId,
            data: {
                latitude: resource.point.coordinates[0],
                longitude: resource.point.coordinates[1],
                type: type[resource.type-1]
            }
        }));

        pendingEventsFor[this.caller.clientId] = results;
        resultCount = results.length;
    }
    sendNext(this.socket);
    return resultCount;
};

/**
 * Stop any pending requested messages (search results).
 */
BingTraffic.stop = function() {
    delete pendingEventsFor[this.caller.clientId];
    return 'stopped';
};

BingTraffic.COMPATIBILITY = {
    path: 'Traffic',
    arguments: {
        search: {
            southLatitude: 'southLat',
            northLatitude: 'northLat',
            eastLongitude: 'eastLng',
            westLongitude: 'westLng'
        }
    }
};

module.exports = BingTraffic;


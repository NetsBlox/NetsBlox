/**
 * The Traffic Service provides access to real-time traffic data using the Bing Traffic API.
 * For more information, check out https://msdn.microsoft.com/en-us/library/hh441725.aspx
 * @service
 */

'use strict';

const logger = require('../utils/logger')('traffic');
const API_KEY = process.env.BING_TRAFFIC_KEY;
const request = require('request');
const baseUrl = 'http://dev.virtualearth.net/REST/v1/Traffic/Incidents/';
let msgs = [];

// Helper function to send the messages to the client
var sendNext = function(socket) {
    if (msgs) {
        var msg = msgs.shift();  // retrieve the first message

        while (msgs.length && msg.dstId !== socket.role) {
            msg = msgs.shift();
        }

        // check the roleId
        if (msgs.length && msg.dstId === socket.role) {
            socket.send(msg);
        }

        if (msgs.length) {
            setTimeout(sendNext, 250, socket);
        }
    }
};

if (!process.env.BING_TRAFFIC_KEY) {
    logger.trace('Env variable BING_TRAFFIC_KEY is not set thus the traffic service is disabled.');
}else{
    module.exports = {

        search: function(westLongitude, northLatitude, eastLongitude, southLatitude) {

            // for bounding box
            var response = this.response,
                socket = this.socket,
                url = baseUrl + southLatitude + ',' + westLongitude + ',' + northLatitude +
                    ',' + eastLongitude + '?key=' + API_KEY;

            logger.trace(`Requesting traffic accidents in ${westLongitude},${northLatitude},${eastLongitude},${southLatitude}`);
            request(url, (err, res, body) => {

                if (err) {
                    logger.trace('Error:' + err);
                    return response.send('Could not access 3rd party API');
                }

                try {
                    body = JSON.parse(body);
                } catch(e) {
                    logger.trace('Non-JSON data...');
                    return response.send('Bad API Result: ' + body);
                }

                if (body.statusCode == 400) {
                    logger.trace('Invalid parameters...');
                    return response.send('The area is too big! Try zooming in more.');
                }

                var type = ['Accident', 'Congestion', 'Disabled Vehicle', 'Mass Transit', 'Miscellaneous',
                    'Other', 'Planned Event', 'Road Hazard', 'Construction', 'Alert', 'Weather'];

                // build the list of traffic incidents
                if (body.resourceSets[0].estimatedTotal != 0) {
                    for (var i = 0; i < body.resourceSets[0].resources.length; i++) {
                        var msg = {
                            type: 'message',
                            msgType: 'Traffic',
                            dstId: socket.role,
                            content: {
                                latitude: body.resourceSets[0].resources[i].point.coordinates[0],
                                longitude: body.resourceSets[0].resources[i].point.coordinates[1],
                                type: type[body.resourceSets[0].resources[i].type-1]
                            }
                        };
                        msgs.push(msg);
                    }
                }
                sendNext(socket);
                response.sendStatus(200);
            });
            return null;
        },

        stop: function() {
            var socket = this.socket;
            if (msgs) {
                // remove those with a different roleId | dont remove other's messages
                msgs = msgs.filter(msg => {
                    return msg.dstId != socket.role;
                });
            }
            return 'stopped';
        },
        COMPATIBILITY: {
            search: {
                southLatitude: 'southLat',
                northLatitude: 'northLat',
                eastLongitude: 'eastLng',
                westLongitude: 'westLng'
            }
        }
    };
}

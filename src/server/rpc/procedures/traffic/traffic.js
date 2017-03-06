// This will use the Bing traffic API to retrieve a list of traffic incidents and send
// a message to the user with the data

'use strict';

var debug = require('debug'),
    trace = debug('netsblox:rpc:traffic:trace'),
    API_KEY = process.env.BING_TRAFFIC_KEY,
    request = require('request'),
    baseUrl = 'http://dev.virtualearth.net/REST/v1/Traffic/Incidents/',
    msgs = [];

// Helper function to send the messages to the client
var sendNext = function(socket) {
    if (msgs) {
        var msg = msgs.shift();  // retrieve the first message

        while (msgs.length && msg.dstId !== socket.roleId) {
            msg = msgs.shift();
        }

        // check the roleId
        if (msgs.length && msg.dstId === socket.roleId) {
            socket.send(msg);
        }

        if (msgs.length) {
            setTimeout(sendNext, 250, socket);
        } 
    }
};

if (!process.env.BING_TRAFFIC_KEY) {
    trace('Env variable BING_TRAFFIC_KEY is not set thus the traffic service is disabled.');
}else{   
    module.exports = {

        isStateless: true,
        getPath: () => '/traffic',

        search: function(westLongitude, northLatitude, eastLongitude, southLatitude) {

            // for bounding box
            var response = this.response,
                socket = this.socket,
                url = baseUrl + southLatitude + ',' + westLongitude + ',' + northLatitude +
                    ',' + eastLongitude + '?key=' + API_KEY;

            trace(`Requesting traffic accidents in ${westLongitude},${northLatitude},${eastLongitude},${southLatitude}`);
            request(url, (err, res, body) => {
                
                if (err) {
                    trace('Error:' + err);
                    return response.send('Could not access 3rd party API');
                }

                try {
                    body = JSON.parse(body);
                } catch(e) {
                    trace('Non-JSON data...');
                    return response.send('Bad API Result: ' + body);
                }

                if (body.statusCode == 400) {
                    trace('Invalid parameters...');
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
                            dstId: socket.roleId,
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
                    return msg.dstId != socket.roleId;
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

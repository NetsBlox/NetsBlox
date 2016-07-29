// This will use the Bing traffic API to retrieve a list of traffic incidents and send
// a message to the user with the data

'use strict';

var debug = require('debug'),
    log = debug('NetsBlox:RPCManager:Traffic:log'),
    error = debug('NetsBlox:RPCManager:Traffic:error'),
    trace = debug('NetsBlox:RPCManager:Traffic:trace'),
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

module.exports = {

    isStateless: true,
    getPath: () => '/traffic',
    getActions: () => ['search', 'stop'],  // function available to client

    search: function(req, res) {

    	// for bounding box
        var southLat = req.query.southLat,
            westLng = req.query.westLng,
            northLat = req.query.northLat,
            eastLng = req.query.eastLng,
         
            incidents = [],
            url = baseUrl + southLat + ',' + westLng + ',' + northLat + ',' + eastLng + '?key=' + API_KEY;

    	request(url, function(err, response, body) {
    		
    		if (err) {
    			trace("Error:" + err);
    			return;
    		}

    		try {
    			body = JSON.parse(body);
    		} catch(e) {
    			trace("Non-JSON data...");
    			return;
    		}

    		if (body.statusCode == 400) {
    			trace("Invalid parameters...");
                return res.send('The area is too big! Try zooming in more.');
    		}

            var type = ['Accident', 'Congestion', 'Disabled Vehicle', 'Mass Transit', 'Miscellaneous', 
                        'Other', 'Planned Event', 'Road Hazard', 'Construction', 'Alert', 'Weather'];

            // build the list of traffic incidents
            if (body.resourceSets[0].estimatedTotal != 0) {
                for (var i = 0; i < body.resourceSets[0].resources.length; i++) {
                    var msg = {
                        type: 'message',
                        msgType: 'Traffic',
                        dstId: req.netsbloxSocket.roleId,
                        content: {
                            latitude: body.resourceSets[0].resources[i].point.coordinates[0],
                            longitude: body.resourceSets[0].resources[i].point.coordinates[1],
                            type: type[body.resourceSets[0].resources[i].type-1]
                        }
                    };
                    msgs.push(msg);
                }
            }
            sendNext(req.netsbloxSocket);
            res.sendStatus(200);
    	});
    },

    stop: function(req, res) {
        msgs = [];
        res.sendStatus(200);
    }
};
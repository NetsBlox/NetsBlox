'use strict';

var debug = require('debug'),
    log = debug('NetsBlox:RPCManager:Traffic:log'),
    error = debug('NetsBlox:RPCManager:Traffic:error'),
    trace = debug('NetsBlox:RPCManager:Traffic:trace'),
    API_KEY = process.env.BING_TRAFFIC_KEY,
    request = require('request'),
	baseUrl = 'http://dev.virtualearth.net/REST/v1/Traffic/Incidents/';

module.exports = {

    // This is very important => Otherwise it will try to instantiate this
    isStateless: true,

    // These next two functions are the same from the stateful RPC's
    getPath: function() {
        return '/traffic';
    },

    getActions: function() {
        return ['search'];
    },

    search: function(req, res) {
        var southlat = req.query.southlat,
            westlng = req.query.westlng,
            northlat = req.query.northlat,
            eastlng = req.query.eastlng,
            incidents = [],
            url = baseUrl + southlat + ',' + westlng + ',' + northlat + ',' + eastlng + '?key=' + API_KEY;

    	request(url, function(err, response, body) {
    		body = JSON.parse(body);
            for (var i = 0; i < body.resourceSets[0].resources.length; i++) {
                incidents.push(body.resourceSets[0].resources[i].point.coordinates[0]);
                incidents.push(body.resourceSets[0].resources[i].point.coordinates[1]);
                incidents.push(body.resourceSets[0].resources[i].type);
            }
            return res.json(incidents);
    	});
    }
};
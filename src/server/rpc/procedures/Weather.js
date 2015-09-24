// This is a static rpc collection. That is, it does not maintain state and is 
// shared across groups
'use strict';

var path = require('path'),
    tuc = require('temp-units-conv'),
    request = require('request');

var baseUrl = 'http://api.openweathermap.org/data/2.5/weather';

module.exports = {

    // This is very important => Otherwise it will try to instantiate this
    isStateless: true,

    // These next two functions are the same from the stateful RPC's
    getPath: function() {
        return '/weather';
    },

    getActions: function() {
        return ['temp',
                'humidity',
                'description'];
    },

    temp: function(req, res) {
        var url = baseUrl + '?lat=' + req.query.lat + '&lon=' + req.query.lon;
        request(url, function(err, response, body) {
            if (err) {
                return res.status(500).send('ERROR: '+err);
            }
            body = JSON.parse(body);
            var temp = body.main.temp;
            return res.json(tuc.k2f(temp));
        });
    },

    humidity: function(req, res) {
        var url = baseUrl + '?lat=' + req.query.lat + '&lon=' + req.query.lon;
        request(url, function(err, response, body) {
            if (err) {
                return res.status(500).send('ERROR: '+err);
            }
            body = JSON.parse(body);
            var humidity = body.main.humidity;
            return res.json(humidity);
        });
    },

    description: function(req, res) {
        var url = baseUrl + '?lat=' + req.query.lat + '&lon=' + req.query.lon;
        request(url, function(err, response, body) {
            if (err) {
                return res.status(500).send('ERROR: '+err);
            }
            body = JSON.parse(body);
            var description = body.weather[0].description;
            return res.json(description);
        });
    }
};

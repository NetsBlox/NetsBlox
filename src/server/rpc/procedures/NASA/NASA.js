// This will utilize NASA's public APIs in order to provide data to the client

'use strict';

var debug = require('debug'),
    log = debug('NetsBlox:RPCManager:NASA:log'),
    error = debug('NetsBlox:RPCManager:NASA:error'),
    trace = debug('NetsBlox:RPCManager:NASA:trace'),
    request = require('request'),
    KEY = process.env.NASA_KEY,
    APOD_URL = 'https://api.nasa.gov/planetary/apod?api_key=' + KEY,
    MARS_URL = 'http://marsweather.ingenology.com/v1/latest/';

module.exports = {

    isStateless: true,
    getPath: () => '/NASA',

    // NASA's 'Astronomy Picture of the Day'
    apod: function() {
        request(APOD_URL, function(err, response, body) {
            body = JSON.parse(body);
            var msg = {
                type: 'message',
                msgType: 'Astronomy Pic of the Day',
                dstId: this.socket.roleId,
                content: {
                    date: body.date,
                    title: body.title,
                    link: body.url,
                    description: body.explanation
                }
            };
            this.socket.send(msg);
            return this.response.json(true);
        });
        return null;
    },

    // NASA's 'Astronomy Picture of the Day' media
    apodMedia: function() {
        request(APOD_URL, function(err, response, body) {
            body = JSON.parse(body);
            request.get(body.url).pipe(this.response);
        });
        return null;
    },

    // Latest Mars data according to MAAS
    marsHighTemp: function() {
        request(MARS_URL, function(err, response, body) {
            body = JSON.parse(body);
            return this.response.json(body.report.max_temp_fahrenheit);
        });
        return null;
    },

    marsLowTemp: function() {
        request(MARS_URL, function(err, response, body) {
            body = JSON.parse(body);
            return this.response.json(body.report.min_temp_fahrenheit);
        });
        return null;
    },

    marsWeather: function() {
        request(MARS_URL, function(err, response, body) {
            body = JSON.parse(body);
            return this.response.json(body.report.atmo_opacity);
        });
        return null;
    }

};

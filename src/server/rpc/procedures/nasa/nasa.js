/**
 * The NASA Service provides access to planetary pictures and mars weather data.
 * For more information, check out https://api.nasa.gov/.
 * @service
 */
// This will utilize NASA's public APIs in order to provide data to the client

'use strict';

var request = require('request'),
    KEY = process.env.NASA_KEY,
    APOD_URL = 'https://api.nasa.gov/planetary/apod?api_key=' + KEY,
    MARS_URL = 'http://marsweather.ingenology.com/v1/latest/';

module.exports = {

    serviceName: 'NASA',

    // NASA's 'Astronomy Picture of the Day'
    apod: function() {
        var response = this.response,
            socket = this.socket;

        request(APOD_URL, function(err, res, body) {
            body = JSON.parse(body);
            var msg = {
                type: 'message',
                msgType: 'Astronomy Pic of the Day',
                dstId: socket.role,
                content: {
                    date: body.date,
                    title: body.title,
                    link: body.url,
                    description: body.explanation
                }
            };
            socket.send(msg);
            return response.json(true);
        });
        return null;
    },

    // NASA's 'Astronomy Picture of the Day' media
    apodMedia: function() {
        var response = this.response;

        request(APOD_URL, function(err, res, body) {
            body = JSON.parse(body);
            request.get(body.url).pipe(response);
        });
        return null;
    },

    // Latest Mars data according to MAAS
    marsHighTemp: function() {
        var response = this.response;

        request(MARS_URL, function(err, res, body) {
            body = JSON.parse(body);
            return response.json(body.report.max_temp_fahrenheit);
        });
        return null;
    },

    marsLowTemp: function() {
        var response = this.response;

        request(MARS_URL, function(err, res, body) {
            body = JSON.parse(body);
            return response.json(body.report.min_temp_fahrenheit);
        });
        return null;
    },

    marsWeather: function() {
        var response = this.response;

        request(MARS_URL, function(err, res, body) {
            body = JSON.parse(body);
            return response.json(body.report.atmo_opacity);
        });
        return null;
    }
};

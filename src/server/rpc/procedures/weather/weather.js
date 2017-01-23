// This is a static rpc collection. That is, it does not maintain state and is 
// shared across groups
'use strict';

var debug = require('debug'),
    log = debug('netsblox:rpc:weather:log'),
    error = debug('netsblox:rpc:weather:error'),
    trace = debug('netsblox:rpc:weather:trace'),
    tuc = require('temp-units-conv'),
    API_KEY = process.env.OPEN_WEATHER_MAP_KEY,
    MAX_DISTANCE = +process.env.WEATHER_MAX_DISTANCE || Infinity,  // miles
    geolib = require('geolib'),
    request = require('request');

var baseUrl = 'http://api.openweathermap.org/data/2.5/weather?APPID='+API_KEY,
    baseIconUrl = 'http://openweathermap.org/img/w/';

var isWithinMaxDistance = function(result, lat, lng) {
    var distance = geolib.getDistance(
        {latitude: lat, longitude: lng},
        {latitude: result.coord.lat, longitude: result.coord.lon}
    );
    distance *= 0.000621371;
    trace(`closest measurement is ${distance} miles from request`);
    if (distance > MAX_DISTANCE) {
        error(`No temperature within ${MAX_DISTANCE} miles of ${lat}, ${lng}`);
    }
    return distance < MAX_DISTANCE;
};

module.exports = {

    // This is very important => Otherwise it will try to instantiate this
    isStateless: true,

    // These next two functions are the same from the stateful RPC's
    getPath: function() {
        return '/weather';
    },

    temp: function(latitude, longitude) {
        var url = baseUrl + '&lat=' + latitude + '&lon=' + longitude,
            response = this.response;

        trace('temp request for ' + latitude + ', ' + longitude);
        request(url, (err, res, body) => {
            if (err || res.statusCode < 200 || res.statusCode > 299) {
                log('ERROR: ', (err || body));
                return response.send('ERROR: '+(err || body));
            }
            body = JSON.parse(body);

            var temp = 'unknown';
            if (body.main && isWithinMaxDistance(body, latitude, longitude)) {
                temp = body.main.temp;
                trace('Kelvin temp is '+temp+' fahrenheit is '+tuc.k2f(temp));
                temp = Math.round(tuc.k2f(temp));
            }
            return response.json(temp);
        });

        return null;
    },

    humidity: function(latitude, longitude) {
        var url = baseUrl + '&lat=' + latitude + '&lon=' + longitude,
            response = this.response;

        request(url, (err, res, body) => {
            if (err || res.statusCode < 200 || res.statusCode > 299) {
                log('ERROR: ', (err || body));
                return response.send('ERROR: '+(err || body));
            }
            body = JSON.parse(body);
            var humidity = 'unknown';
            if (isWithinMaxDistance(body, latitude, longitude)) {
                humidity = body.main.humidity;
            }
            return response.json(humidity);
        });

        return null;
    },

    description: function(latitude, longitude) {
        var url = baseUrl + '&lat=' + latitude + '&lon=' + longitude,
            response = this.response;

        request(url, (err, res, body) => {
            if (err || res.statusCode < 200 || res.statusCode > 299) {
                log('ERROR: ', (err || body));
                return response.status(500).send('ERROR: '+(err || body));
            }
            body = JSON.parse(body);
            var description = 'unknown';
            if (isWithinMaxDistance(body, latitude, longitude)) {
                description = body.weather[0].description;
            }
            return response.json(description);
        });

        return null;
    },

    icon: function(latitude, longitude) {
        var url = baseUrl + '&lat=' + latitude + '&lon=' + longitude,
            response = this.response;

        request(url, (err, res, body) => {
            if (err || res.statusCode < 200 || res.statusCode > 299) {
                log('ERROR: ', (err || body));
                return response.status(500).send('ERROR: '+(err || body));
            }
            body = JSON.parse(body);
            // Return sunny if unknown
            var iconName = '01d.png';
            if (body.weather && body.weather[0]) {
                iconName = body.weather[0].icon+'.png';
            }
            request.get(baseIconUrl+iconName).pipe(response);
        });
        return null;
    },

    windSpeed: function(latitude, longitude) {
        var url = baseUrl + '&lat=' + latitude + '&lon=' + longitude,
            response = this.response;

        request(url, (err, res, body) => {
            if (err || res.statusCode < 200 || res.statusCode > 299) {
                log('ERROR: ', (err || body));
                return response.status(500).send('ERROR: '+(err || body));
            }
            body = JSON.parse(body);
            var name = 'unknown';
            if (isWithinMaxDistance(body, latitude, longitude)) {
                name = body.wind.speed || 'unknown';
            }
            response.json(name);
        });

        return null;
    },

    windAngle: function(latitude, longitude) {
        var url = baseUrl + '&lat=' + latitude + '&lon=' + longitude,
            response = this.response;

        request(url, (err, res, body) => {
            if (err || res.statusCode < 200 || res.statusCode > 299) {
                log('ERROR: ', (err || body));
                return response.status(500).send('ERROR: '+(err || body));
            }
            body = JSON.parse(body);
            var name = 'unknown';
            if (isWithinMaxDistance(body, latitude, longitude)) {
                name = body.wind.deg || 'unknown';
            }
            response.json(name);
        });

        return null;
    },

    COMPATIBILITY: {
        windAngle: {
            latitude: 'lat',
            longitude: 'lng'
        },
        windSpeed: {
            latitude: 'lat',
            longitude: 'lng'
        },
        temp: {
            latitude: 'lat',
            longitude: 'lng'
        },
        humidity: {
            latitude: 'lat',
            longitude: 'lng'
        },
        description: {
            latitude: 'lat',
            longitude: 'lng'
        },
        icon: {
            latitude: 'lat',
            longitude: 'lng'
        }
    }

    // Consider moving this to a map utils rpc FIXME
    //name: function(req, res) {
        //var lat = req.query.lat,
            //lng = req.query.lng,
            //url = baseUrl + '&lat=' + lat + '&lon=' + lng;

        //request(url, function(err, response, body) {
            //if (err || response.statusCode < 200 || response.statusCode > 299) {
                //log('ERROR: ', (err || body));
                //return res.status(500).send('ERROR: '+(err || body));
            //}
            //body = JSON.parse(body);
            //var name = 'unknown';
            //if (isWithinMaxDistance(body, lat, lng)) {
                //name = body.name || 'unknown';
            //}
            //res.json(name);
        //});
    //}
};

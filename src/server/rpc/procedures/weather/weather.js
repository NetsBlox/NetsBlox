// This is a static rpc collection. That is, it does not maintain state and is
// shared across groups
'use strict';

var debug = require('debug'),
    error = debug('netsblox:rpc:weather:error'),
    trace = debug('netsblox:rpc:weather:trace'),
    tuc = require('temp-units-conv'),
    ApiConsumer = require('../utils/api-consumer'),
    _ = require('lodash'),
    API_KEY = process.env.OPEN_WEATHER_MAP_KEY,
    MAX_DISTANCE = +process.env.WEATHER_MAX_DISTANCE || Infinity,  // miles
    geolib = require('geolib');

const baseUrl = 'http://api.openweathermap.org/data/2.5/weather?APPID='+API_KEY,
    baseIconUrl = 'http://openweathermap.org/img/w/';

let weather = new ApiConsumer('Weather', 'http://api.openweathermap.org/data/2.5/weather?APPID='+API_KEY, {cache: {ttl: 60}});

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


weather.temp = function(latitude, longitude){
    return this._requestData({queryString: '&lat=' + latitude + '&lon=' + longitude})
        .then(body => {
            var temp = 'unknown';
            if (body.main && isWithinMaxDistance(body, latitude, longitude)) {
                temp = body.main.temp;
                trace('Kelvin temp is '+temp+' fahrenheit is '+tuc.k2f(temp));
                temp = tuc.k2f(temp).toFixed(3);
            }
            this.response.send(temp);
        });
};

weather.humidity = function(latitude, longitude){
    return this._requestData({queryString: '&lat=' + latitude + '&lon=' + longitude})
        .then(body => {
            var humidity = 'unknown';
            if (isWithinMaxDistance(body, latitude, longitude)) {
                humidity = body.main.humidity;
            }
            this.response.send(humidity);
        });
};


weather.description = function(latitude, longitude){
    return this._requestData({queryString: '&lat=' + latitude + '&lon=' + longitude})
        .then(body => {
            var description = 'unknown';
            if (isWithinMaxDistance(body, latitude, longitude)) {
                description = body.weather[0].description;
            }
            this.response.send(description);
        });
};

weather.windSpeed = function(latitude, longitude){
    return this._requestData({queryString: '&lat=' + latitude + '&lon=' + longitude})
        .then(body => {
            var speed = 'unknown';
            if (isWithinMaxDistance(body, latitude, longitude)) {
                speed = body.wind.speed || 'unknown';
            }
            this.response.send(speed);
        });
};

weather.windAngle = function(latitude, longitude){
    return this._requestData({queryString: '&lat=' + latitude + '&lon=' + longitude})
        .then(body => {
            var deg = 'unknown';
            if (isWithinMaxDistance(body, latitude, longitude)) {
                deg = body.wind.deg || 'unknown';
            }
            this.response.send(deg);
        });
};

weather.icon = function(latitude, longitude){
    return this._requestData({queryString: '&lat=' + latitude + '&lon=' + longitude})
        .then(body => {
            // Return sunny if unknown
            var iconName = '01d.png';
            if (body.weather && body.weather[0]) {
                iconName = body.weather[0].icon+'.png';
            }
            let queryOpts = {
                queryString: iconName,
                baseUrl: 'http://openweathermap.org/img/w/',
                cache: false
            }
            return this._sendImage(queryOpts);
        });
};


const compatibility = {
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
};
module.exports = _.merge(weather, compatibility);

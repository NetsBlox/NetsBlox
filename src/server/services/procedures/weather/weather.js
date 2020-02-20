/**
 * The Weather Service provides access to real-time weather data using OpenWeatherMap.
 * For more information, check out https://openweathermap.org/.
 *
 * Terms of Service: https://openweathermap.org/terms
 *
 * @service
 * @category Science
 */
'use strict';

const logger = require('../utils/logger')('weather');
const tuc = require('temp-units-conv');
const {OpenWeatherMapKey} = require('../utils/api-key');
const ApiConsumer = require('../utils/api-consumer');
const MAX_DISTANCE = +process.env.WEATHER_MAX_DISTANCE || Infinity;  // miles
const geolib = require('geolib');

const weather = new ApiConsumer('Weather', 'http://api.openweathermap.org/data/2.5/weather', {cache: {ttl: 60}});
ApiConsumer.setRequiredApiKey(weather, OpenWeatherMapKey);

const isWithinMaxDistance = function(result, lat, lng) {
    var distance = geolib.getDistance(
        {latitude: lat, longitude: lng},
        {latitude: result.coord.lat, longitude: result.coord.lon}
    );
    distance *= 0.000621371;
    logger.trace(`closest measurement is ${distance} miles from request`);
    if (distance > MAX_DISTANCE) {
        logger.error(`No measurement within ${MAX_DISTANCE} miles of ${lat}, ${lng}`);
    }
    return distance < MAX_DISTANCE;
};

weather._queryString = function(latitude, longitude) {
    return `APPID=${this.apiKey.value}&lat=${latitude}&lon=${longitude}`;
};

/**
 * Get the current temperature for a given location.
 * @param {Latitude} latitude
 * @param {Longitude} longitude
 */
weather.temperature = function(latitude, longitude){
    return this._requestData({queryString: this._queryString(latitude, longitude)})
        .then(body => {
            var temp = 'unknown';
            if (body.main && isWithinMaxDistance(body, latitude, longitude)) {
                temp = body.main.temp;
                logger.trace('Kelvin temp is '+temp+' fahrenheit is '+tuc.k2f(temp));
                temp = tuc.k2f(temp).toFixed(1);
            }
            return temp;
        });
};

/**
 * Get the current temperature for a given location.
 * @deprecated
 * @param {Latitude} latitude
 * @param {Longitude} longitude
 */
weather.temp = function(latitude, longitude) {
    return this.temperature(latitude, longitude);
};

/**
 * Get the current humidity for a given location.
 * @param {Latitude} latitude
 * @param {Longitude} longitude
 */
weather.humidity = function(latitude, longitude){
    return this._requestData({queryString: this._queryString(latitude, longitude)})
        .then(body => {
            var humidity = 'unknown';
            if (isWithinMaxDistance(body, latitude, longitude)) {
                humidity = body.main.humidity;
            }
            return humidity;
        });
};

/**
 * Get a short description of the current weather for a given location.
 * @param {Latitude} latitude
 * @param {Longitude} longitude
 */
weather.description = function(latitude, longitude){
    return this._requestData({queryString: this._queryString(latitude, longitude)})
        .then(body => {
            var description = 'unknown';
            if (isWithinMaxDistance(body, latitude, longitude)) {
                description = body.weather[0].description;
            }
            return description;
        });
};

/**
 * Get the current wind speed for a given location.
 * @param {Latitude} latitude
 * @param {Longitude} longitude
 */
weather.windSpeed = function(latitude, longitude){
    return this._requestData({queryString: this._queryString(latitude, longitude)})
        .then(body => {
            var speed = 'unknown';
            if (isWithinMaxDistance(body, latitude, longitude)) {
                speed = body.wind.speed || 'unknown';
            }
            return speed;
        });
};

/**
 * Get the current wind direction for a given location.
 * @param {Latitude} latitude
 * @param {Longitude} longitude
 */
weather.windAngle = function(latitude, longitude){
    return this._requestData({queryString: this._queryString(latitude, longitude)})
        .then(body => {
            var deg = 'unknown';
            if (isWithinMaxDistance(body, latitude, longitude)) {
                deg = body.wind.deg || 'unknown';
            }
            return deg;
        });
};

/**
 * Get a small icon of the current weather for a given location.
 * @param {Latitude} latitude
 * @param {Longitude} longitude
 */
weather.icon = function(latitude, longitude){
    return this._requestData({queryString: this._queryString(latitude, longitude)})
        .then(body => {
            // Return sunny if unknown
            var iconName = '01d.png';
            if (body.weather && body.weather[0]) {
                iconName = body.weather[0].icon+'.png';
            }
            let queryOpts = {
                url: 'http://openweathermap.org/img/w/' + iconName,
            };
            return this._sendImage(queryOpts);
        });
};


weather.COMPATIBILITY =  {
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
};

module.exports = weather;

/**
 * The NASA Service provides access to planetary pictures and mars weather data.
 * For more information, check out https://api.nasa.gov/.
 * @service
 */
// This will utilize NASA's public APIs in order to provide data to the client

'use strict';

var axios = require('axios'),
    KEY = process.env.NASA_KEY,
    APOD_URL = 'https://api.nasa.gov/planetary/apod?api_key=' + KEY,
    MARS_URL = 'http://marsweather.ingenology.com/v1/latest/';

module.exports = {

    serviceName: 'NASA',

    // NASA's 'Astronomy Picture of the Day'
    apod: async function() {
        var socket = this.socket;
        let { data: body } = await axios.get(APOD_URL);
        const msgType = 'Astronomy Pic of the Day';
        const content = {
            date: body.date,
            title: body.title,
            link: body.url,
            description: body.explanation
        };
        socket.sendMessage(msgType, content);
        return true;
    },

    /**
     * NASA's 'Astronomy Picture of the Day' media
     * @returns {String}
     */
    apodMedia: async function() {
        let { data: body } = await axios.get(APOD_URL);
        return body.url;
    },

    // Latest Mars data according to MAAS
    marsHighTemp: async function() {
        let { data: body } = await axios.get(MARS_URL);
        return body.report.max_temp_fahrenheit;
    },

    marsLowTemp: async function() {
        let { data: body } = await axios.get(MARS_URL);
        return body.report.min_temp_fahrenheit;
    },

    marsWeather: async function() {
        let { data: body } = await axios.get(MARS_URL);
        return body.report.atmo_opacity;
    }
};

/**
 * The NASA Service provides access to planetary pictures and mars weather data.
 * For more information, check out https://api.nasa.gov/.
 *
 * @service
 * @category Science
 */

'use strict';

var axios = require('axios'),
    rpcUtils = require('../utils'),
    KEY = process.env.NASA_KEY,
    APOD_URL = 'https://api.nasa.gov/planetary/apod?api_key=' + KEY,
    MARS_URL = 'http://marsweather.ingenology.com/v1/latest/';


async function fetchApod() {
    const { data: body } = await axios.get(APOD_URL);
    const info = {
        date: body.date,
        title: body.title,
        link: body.url,
        description: body.explanation
    };
    return info;
}

module.exports = {

    serviceName: 'NASA',

    // NASA's 'Astronomy Picture of the Day'
    apod: async function() {
        var socket = this.socket;
        const msgType = 'Astronomy Pic of the Day';
        const content = await fetchApod();
        socket.sendMessage(msgType, content);
        return true;
    },

    apodDetails: async function() {
        const data = await fetchApod();
        return rpcUtils.jsonToSnapList(data);
    },

    /**
     * NASA's 'Astronomy Picture of the Day' media
     * @returns {String}
     */
    apodMedia: async function() {
        let { data: body } = await axios.get(APOD_URL);
        return body.url;
    },

    /**
     * @deprecated
     */
    // Latest Mars data according to MAAS
    marsHighTemp: async function() {
        let { data: body } = await axios.get(MARS_URL);
        return body.report.max_temp_fahrenheit;
    },

    /**
     * @deprecated
     */
    marsLowTemp: async function() {
        let { data: body } = await axios.get(MARS_URL);
        return body.report.min_temp_fahrenheit;
    },

    /**
     * @deprecated
     */
    marsWeather: async function() {
        let { data: body } = await axios.get(MARS_URL);
        return body.report.atmo_opacity;
    }
};

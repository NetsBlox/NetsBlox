/**
 * The NASA Service provides access to planetary pictures and mars weather data.
 * For more information, check out https://api.nasa.gov/.
 *
 * @service
 * @category Science
 */

'use strict';

const {NASAKey} = require('../utils/api-key');
const utils = require('../utils');
const axios = require('axios');
const MARS_URL = 'http://marsweather.ingenology.com/v1/latest/';

const NASA = {};
NASA.serviceName = 'NASA';
utils.setRequiredAPIKey(NASA, NASAKey);

NASA._fetchApod = async function() {
    const { data: body } = await axios.get(this._apodUrl());
    const info = {
        date: body.date,
        title: body.title,
        link: body.url,
        description: body.explanation
    };
    return info;
};

NASA._apodUrl = function() {
    return 'https://api.nasa.gov/planetary/apod?api_key=' + this.apiKey.value;
};

// NASA's 'Astronomy Picture of the Day'
NASA.apod = async function() {
    const msgType = 'Astronomy Pic of the Day';
    const content = await this._fetchApod();
    this.socket.sendMessage(msgType, content);
    return true;
};

NASA.apodDetails = async function() {
    return await this._fetchApod();
};

/**
 * NASA's 'Astronomy Picture of the Day' media
 *
 * @returns {String}
 */
NASA.apodMedia = async function() {
    let { data: body } = await axios.get(this._apodUrl());
    return body.url;
};

/**
 * Latest Mars data according to MAAS
 * @deprecated
 */
NASA.marsHighTemp = async function() {
    let { data: body } = await axios.get(MARS_URL);
    return body.report.max_temp_fahrenheit;
};

/**
 * @deprecated
 */
NASA.marsLowTemp = async function() {
    let { data: body } = await axios.get(MARS_URL);
    return body.report.min_temp_fahrenheit;
};

/**
 * @deprecated
 */
NASA.marsWeather = async function() {
    let { data: body } = await axios.get(MARS_URL);
    return body.report.atmo_opacity;
};

module.exports = NASA;

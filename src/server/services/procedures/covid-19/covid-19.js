/**
 * The COVID-19 Service provides access to the 2019-nCoV dataset compiled by Johns Hopkins University.
 * This dataset includes deaths, confirmed cases, and recoveries related to the COVID-19 pandemic.
 *
 * For more information, check out https://data.humdata.org/dataset/novel-coronavirus-2019-ncov-cases
 *
 * @service
 * @category Science
 */
const logger = require('../utils/logger')('covid-19');
const _ = require('lodash');
const getServiceStorage = require('../../advancedStorage');
const schema = {
    date: Date,
    country: String,
    state: String,
    city: String,
    latitude: Number,
    longitude: Number,
    confirmed: Number,
    deaths: Number,
    recovered: Number,
};
const COVID19Storage = getServiceStorage('COVID-19', schema);
const COVID19 = {};
COVID19.serviceName = 'COVID-19';
const Data = require('./data');
COVID19._data = new Data(COVID19Storage);
const {DEATH, CONFIRMED, RECOVERED} = COVID19._data.types;

COVID19Storage.findOne({}).then(result => {
    if (!result) {
        logger.info('No data found in database, importing latest from JHU...');
        COVID19._data.importPastData();
    }
});

/**
 * Get number of confirmed cases of COVID-19 by date for a specific country and state.
 *
 * Date is in month/day/year format.
 *
 * @param{String} country Country or region
 * @param{String=} state State or province
 * @param{String=} city City
 */
COVID19.getConfirmedCounts = async function(country, state='', city='') {
    return await this._data.getData(CONFIRMED, country, state, city);
};

/**
 * Get number of cases of COVID-19 resulting in death by date for a specific country and state.
 *
 * Date is in month/day/year format.
 *
 * @param{String} country Country or region
 * @param{String=} state State or province
 * @param{String=} city City
 */
COVID19.getDeathCounts = async function(country, state='', city='') {
    return await this._data.getData(DEATH, country, state, city);
};

/**
 * Get number of cases of COVID-19 in which the person recovered by date for a specific country and state.
 *
 * Date is in month/day/year format.
 *
 * @param{String} country Country or region
 * @param{String=} state State or province
 * @param{String=} city City
 */
COVID19.getRecoveredCounts = async function(country, state='', city='') {
    return await this._data.getData(RECOVERED, country, state, city);
};

/**
 * Get a list of all countries (and states, cities) with data available.
 */
COVID19.getLocationsWithData = async function() {
    const locations = await this._data.getAllLocations();
    return locations.map(loc => {
        const {state, country, city} = loc;
        return [country, state, city];
    });
};

/**
 * Get the latitude and longitude for a location with data available.
 *
 * @param{String} country
 * @param{String=} state
 * @param{String=} city City
 */
COVID19.getLocationCoordinates = async function(country, state='', city='') {
    const data = await this._data.getLocation(country, state, city);
    return _.pick(data, ['latitude', 'longitude']);
};

module.exports = COVID19;

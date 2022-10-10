/**
 * The COVID-19 Service provides access to the 2019-nCoV dataset compiled by Johns Hopkins University.
 * This dataset includes deaths, confirmed cases, and recoveries related to the COVID-19 pandemic.
 * Vaccination data is provided by Our World in Data.
 *
 * For more information, check out https://data.humdata.org/dataset/novel-coronavirus-2019-ncov-cases
 * and https://github.com/owid/covid-19-data/tree/master/public/data/vaccinations.
 *
 * @service
 * @category Health
 */
const _ = require('lodash');
const getServiceStorage = require('../../advancedStorage');
const vaccination = require('./vaccination/vaccination-data-source');
const {registerTypes, VaccineCategories} = require('./types');
const schema = {
    date: Date,
    region: Object,
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
const logger = require('../utils/logger')('covid-19');
COVID19._data = new Data(logger, COVID19Storage);
const {DEATH, CONFIRMED, RECOVERED} = COVID19._data.types;
registerTypes();

/**
 * Get number of confirmed cases of COVID-19 by date for a specific country and state.
 *
 * Date is in month/day/year format.
 *
 * @param {String} country Country or region
 * @param {String=} state State or province
 * @param {String=} city City
 */
COVID19.getConfirmedCounts = async function(country, state='', city='') {
    return await this._data.getData(CONFIRMED, country, state, city);
};

/**
 * Get number of cases of COVID-19 resulting in death by date for a specific country and state.
 *
 * Date is in month/day/year format.
 *
 * @param {String} country Country or region
 * @param {String=} state State or province
 * @param {String=} city City
 */
COVID19.getDeathCounts = async function(country, state='', city='') {
    return await this._data.getData(DEATH, country, state, city);
};

/**
 * Get number of cases of COVID-19 in which the person recovered by date for a specific country and state.
 *
 * Date is in month/day/year format.
 *
 * @param {String} country Country or region
 * @param {String=} state State or province
 * @param {String=} city City
 */
COVID19.getRecoveredCounts = async function(country, state='', city='') {
    return await this._data.getData(RECOVERED, country, state, city);
};

/**
 * Get a list of all countries (and states, cities) with data available.
 * @returns {Array<Array<String>>} an array of ``[country, state, city]`` for each location with data available
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
 * @param {String} country
 * @param {String=} state
 * @param {String=} city City
 */
COVID19.getLocationCoordinates = async function(country, state='', city='') {
    const data = await this._data.getLocation(country, state, city);
    return _.pick(data, ['latitude', 'longitude']);
};

/**
 * Get the list of US states that can be entered in the getVaccinationData RPC
 * 
 * @category Vaccination
 * @returns {Array<String>}
 */
COVID19.getVaccinationStates = async function() {
    return Object.keys(await vaccination.getUSData());
};
/**
 * The list of countries that can be entered in the getVaccinationData RPC
 * 
 * @category Vaccination
 * @returns {Array<String>}
 */
COVID19.getVaccinationCountries = async function() {
    return Object.keys(await vaccination.getWorldData());
};
/**
 * Get the list of options that can be entered in the getVaccinationData RPC
 * 
 * @category Vaccination
 * @returns {Array<String>}
 */
COVID19.getVaccinationCategories = function() {
    return VaccineCategories;
};

COVID19._getVaccineData = async function(country, state, category) {
    let all = undefined;
    if (country === 'United States' || country === 'USA' || country === 'US') {
        if (!state) throw Error('state is required for United States search');

        all = (await vaccination.getUSData())[state];
        if (all === undefined) throw new Error(`state '${state}' is not in the database`);
    } else {
        if (state) throw Error('Countries other than United States should not specify state');

        all = (await vaccination.getWorldData())[country];
        if (all === undefined) throw new Error(`country '${country}' is not in the database`);
    }

    if (!category) return all;

    const res = {};
    for (const date in all) {
        const t = all[date][category];
        if (t === undefined) throw new Error(`category '${category}' is not in the database`);
        res[date] = t;
    }
    return res;
};

/**
 * Get all available vaccination data for a given country or state (if country is ``United States``).
 * Optionally, you can specify ``category`` to filter to only data for the given category.
 * You can further filter your data by specifying ``startDate`` and ``endDate``.
 *
 * @category Vaccination
 * @param {String} country name of the country for which to get data
 * @param {String=} state name of the state to get data for (if the country is ``United States``)
 * @param {VaccineCategory=} category the category of data to pull (see ``getVaccinationCategories``), or nothing to get all data
 * @param {String=} startDate earliest date to include in result (mm/dd/yyyy)
 * @param {String=} endDate latest date to include in result (mm/dd/yyyy)
 * @returns {Array} the requested data
 */
COVID19.getVaccinationData = async function(country, state, category, startDate, endDate){
    const data = (await COVID19._getVaccineData(country, state, category));
    if (!startDate && !endDate) return data;
    const res = [];

    startDate = new Date(startDate || '01/01/0001');
    endDate = new Date(endDate || '12/31/9999');
    for (const date in data) {
        const d = new Date(date);
        if (startDate <= d && d <= endDate) res.push([date, data[date]]);
    }

    return res;
};

COVID19.initialize = function() {
    this._data.importMissingData();
};

module.exports = COVID19;

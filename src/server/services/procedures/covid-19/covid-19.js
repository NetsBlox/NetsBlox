/**
 * The COVID-19 Service provides access to the 2019-nCoV dataset compiled by Johns Hopkins University.
 * This dataset includes deaths, confirmed cases, and recoveries related to the COVID-19 pandemic.
 *
 * For more information, check out https://data.humdata.org/dataset/novel-coronavirus-2019-ncov-cases
 *
 * @service
 * @category Science
 */
const _ = require('lodash');
const getServiceStorage = require('../../advancedStorage');
const vaccination = require('./Vaccine-Data/vaccination-data-source');
const states = require('./Vaccine-Data/states');
const country = require('./Vaccine-Data/country');
const usVaccineCategories = require('./Vaccine-Data/us-vaccine-categories');
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
const logger = require('../utils/logger')('covid-19');
COVID19._data = new Data(logger, COVID19Storage);
const {DEATH, CONFIRMED, RECOVERED} = COVID19._data.types;

COVID19._data.importMissingData();

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

/**
 * Get number of Covid Vaccination in United States.
 *
 * Date is in month/day/year format.
 *
 */
COVID19._getFullUSVaccinationData = async function(){
    return await vaccination.getUSData();
};
/**
 * Get number of Covid Vaccination in different countries.
 *
 * Date is in month/day/year format.
 *
 */
COVID19._getFullWorldVaccinationData = async function(){
    return await vaccination.getWorldData();
};

/**
 * The list of States in the US that can be entered in the getVaccinationData function
 *
 */
COVID19.getStates = async function() {
    return (states);
};
/**
 * The list of countries that can be entered in the getVaccinationData function
 *
 */
COVID19.getCountry = async function() {
    return (country);
};
/**
 * The list of options that can be entered in the getVaccinationData function
 *
 */
COVID19.getVaccineCategories = async function() {
    return (usVaccineCategories);
};
/**
 * Get number of Covid Vaccination by State.
 *
 * Date is in month/day/year format.
 *
 * @param state name of the state, can be found in getState drop down menu
 */
COVID19._getAllVaccineDataForStates = async function(state) {
    const res = (await vaccination.getUSData())[state];
    if (res === undefined) throw new Error(`states '${state}' is not in the database`);
    else return res;
};
/**
 * Get number of Covid Vaccination by Category in a specific state.
 *
 * Date is in month/day/year format.
 *
 * @param state name of the state, can be found in getState drop down menu
 * @param option name of the Category, can be found in getVaccineCategories drop down menu
 */
COVID19._getCatVaccineDataForStates = async function(state, option='') {
    const raw = (await COVID19._getAllVaccineDataForStates(state));
    if(option === '')
        return raw;

    const res ={};
    for(const date in raw) {
        const data = raw[date];
        const t = data[option];
        if (t === undefined) throw new Error(`option '${option}' is not in the database`);
        res[date] = t;
    }
    return res;
};
/**
 * Get number of Covid Vaccination by Country.
 *
 * Date is in month/day/year format.
 *
 * @param country name of the counties, can be found in getCountry drop down menu
 */

COVID19._getAllVaccineDataForCountry = async function(country) {
    const res = (await vaccination.getWorldData())[country];
    if (res === undefined) throw new Error(`country '${country}' is not in the database`);
    else return res;
};
/**
 * Get number of Covid Vaccination by Category in a specific country.
 *
 * Date is in month/day/year format.
 *
 * @param country name of the state, can be found in getCountry drop down menu
 * @param option name of the Category, can be found in getVaccineCategories drop down menu
 */
COVID19._getCatVaccineDataForCountry = async function(country, option='') {
    const raw = (await COVID19._getAllVaccineDataForCountry(country));
    if(option === '')
        return raw;

    const res ={};
    for(const date in raw) {
        const data = raw[date];
        const t = data[option];
        if (t === undefined) throw new Error(`option '${option}' is not in the database`);
        res[date] = t;
    }
    return res;
};

/**
 * Get number of cases of COVID-19 in which the person recovered by date for a specific country and state.
 *
 * Date is in month/day/year format.
 *
 * @param{String} country Country
 * @param{String=} state State
 * @param{String=} option VaccineCategories
 */
COVID19._getVaccineDataForCountry = async function(country, state = '', option='') {
    if (country === 'United States' ){return await COVID19._getCatVaccineDataForStates(state, option);}
    else {
        if(state !=='') {throw new Error(`Country other than the United States should not have States`);}
        else {
            const res = (await COVID19._getCatVaccineDataForCountry(country, option));
            return res;
        }
    }
};

/**
 * Since January of 2021, Covid Vaccine has been rolled out gradually all over the world. This
 * feature allows users to enter a specific country. If you are searching up a specific state in
 * the United States, you can also enter a state name. Then, you can select a specific type of
 * data you would like to view from the getVaccineCategories menu (example: total vaccination).
 * At last, you can enter a date starting from late January, 2021 till now. An invalid entry
 * will produce an error message.
 *
 * Date is in month/day/year format.
 *
 *
 * @param{String} country country name. The options are listed the getCountry drop down Menu
 * @param{String=} state United States state name. The options are listed the getState drop down
 * Menu
 * @param{String=} option VaccineCategories
 * @param{String=} startDate First Date in mm/dd/yyyy
 * @param{String=} endDate Second Date in mm/dd/yyyy
 */

COVID19.getVaccinationData= async function(country, state='', option='', startDate='01/01/2021', endDate='12/31/3000'){
    const raw = (await COVID19._getVaccineDataForCountry(country, state, option));
    const res = [];
    if (startDate === '' && endDate ==='') return raw;
    const numStart = getDateNum(startDate);
    const numEnd = getDateNum(endDate);

    for(const rawDate in raw) {
        const dateNum = getDateNum(rawDate);
        if(numStart < dateNum && dateNum < numEnd) {
            res.push([rawDate, raw[rawDate]]);
        }
    }
    return res;
};
/**
 * Helper Function to turn date into an int to be compared
 */
function getDateNum(date) {
    const dateVal = date.split('/');
    const numDate= parseInt(dateVal[2]) * 367 + parseInt(dateVal[0]) * 32 + parseInt(dateVal[1]);
    return numDate;
}

module.exports = COVID19;

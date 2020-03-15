/**
 * The COVID-19 Service provides access to the 2019-nCoV dataset compiled by Johns Hopkins University.
 * This dataset includes deaths, confirmed cases, and recoveries related to the COVID-19 pandemic.
 *
 * For more information, check out https://data.humdata.org/dataset/novel-coronavirus-2019-ncov-cases
 *
 * @alpha
 * @service
 * @category Science
 */
const _ = require('lodash');
const COVID19 = {};
COVID19.serviceName = 'COVID-19';
const data = require('./data');
const {DEATH, CONFIRMED, RECOVERED} = data.types;

/**
 * Get number of confirmed cases of COVID-19 by date for a specific country and state.
 *
 * Date is in month/day/year format.
 *
 * @param{String} country Country or region
 * @param{String=} state State or province
 */
COVID19.getConfirmedCounts = async function(country, state='') {
    return await data.getData(CONFIRMED, country, state);
};

/**
 * Get number of cases of COVID-19 resulting in death by date for a specific country and state.
 *
 * Date is in month/day/year format.
 *
 * @param{String} country Country or region
 * @param{String=} state State or province
 */
COVID19.getDeathCounts = async function(country, state='') {
    return await data.getData(DEATH, country, state);
};

/**
 * Get number of cases of COVID-19 in which the person recovered by date for a specific country and state.
 *
 * Date is in month/day/year format.
 *
 * @param{String} country Country or region
 * @param{String=} state State or province
 */
COVID19.getRecoveredCounts = async function(country, state='') {
    return await data.getData(RECOVERED, country, state);
};

/**
 * Get a list of all countries (and states) with data available.
 */
COVID19.getLocationsWithData = function() {
    const locations = data.getAllData().map(row => {
        const [state, country] = row;
        return [country, state];
    });
    return _.uniq(locations);
};

/**
 * Get the latitude and longitude for a location with data available.
 *
 * @param{String} country
 * @param{String=} state
 */
COVID19.getLocationsCoordinates = function(country, state='') {
    const row = data.getRow(CONFIRMED, country, state);
    if (!row) throw new Error('Location not found.');

    const [latitude, longitude] = row.slice(2, 4);
    return {latitude, longitude};
};

module.exports = COVID19;

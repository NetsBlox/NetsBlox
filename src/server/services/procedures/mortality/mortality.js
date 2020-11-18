/**
 * This service accesses data from the human mortality database,
 * which tabulates death rates broken down by age group and gender
 * for various countries.
 * 
 * @alpha
 * @service
 * @category Health
 */
'use strict';

// source: https://www.mortality.org/

const logger = require('../utils/logger')('mortality');
const axios = require('axios');

// this is a direct download link to the CSV file - if you need details on the structure,
// download it, or check https://www.mortality.org/, which has much more detail.
const DATA_SOURCE = 'https://www.mortality.org/Public/STMF/Outputs/stmf.csv';

// maps from country code to country name - keys should be uppercase only.
// the metatable containing this info appears to not be well structured for automation.
// so we have to update this part manually from https://www.mortality.org/Public/STMF/Outputs/stmf.xlsx.
// but this is ok, as converting from code to name is purely cosmetic.
const COUNTRY_CODES = {
    'AUS2': 'Australia', // in the metafile this is AUS, but in the data it is AUS2
    'AUT': 'Austria',
    'BEL': 'Belgium',
    'BGR': 'Bulgaria',
    'CAN': 'Canada',
    'CHE': 'Switzerland',
    'CHL': 'Chile',
    'CZE': 'Czech Republic',
    'DEUTNP': 'Germany',
    'DNK': 'Denmark',
    'ESP': 'Spain',
    'EST': 'Estonia',
    'FIN': 'Finland',
    'FRATNP': 'France',
    'GBRTENW': 'England and Wales',
    'GBR_NIR': 'Northern Ireland',
    'GBR_SCO': 'Scotland',
    'GRC': 'Greece',
    'HRV': 'Croatia',
    'HUN': 'Hungary',
    'ISL': 'Iceland',
    'ISR': 'Israel',
    'ITA': 'Italy',
    'KOR': 'South Korea',
    'LTU': 'Lithuania',
    'LUX': 'Luxembourg',
    'LVA': 'Latvia',
    'NLD': 'Netherlands',
    'NOR': 'Norway',
    'NZL_NP': 'New Zealand',
    'POL': 'Poland',
    'PRT': 'Portugal',
    'RUS': 'Russia',
    'SVK': 'Slovakia',
    'SVN': 'Slovenia',
    'SWE': 'Sweden',
    'USA': 'USA',    
};
function countryCodeToCountry(code) {
    return COUNTRY_CODES[code] || code;
}

function dictPathOrEmptyInit(dict, path) {
    for (const key of path) {
        let sub = dict[key];
        if (sub === undefined) {
            sub = {};
            dict[key] = sub;
        }
        dict = sub;
    }
    return dict;
}

let CACHED_DATA = undefined;
async function getData() {
    if (CACHED_DATA !== undefined) return CACHED_DATA;

    logger.info(`requesting data from ${DATA_SOURCE}`);
    const resp = await axios({url: DATA_SOURCE, method: 'GET'});
    if (resp.status !== 200) {
        logger.error(`download failed with status ${resp.status}`);
        return {}; // return empty data set on failure
    }
    logger.info('download complete - restructuring data');

    const res = {};
    for (const row of resp.data.split(/\r?\n/)) {
        const vals = row.split(',');
        if (vals.length !== 19 || vals[3].trim().length !== 1) continue;

        const country = countryCodeToCountry(vals[0].trim().toUpperCase());
        const year = parseInt(vals[1]);
        const week = parseInt(vals[2]);
        const entry = dictPathOrEmptyInit(res, [country, year, week]);

        const data = {
            'deaths 0-14': parseFloat(vals[4]),
            'deaths 15-64': parseFloat(vals[5]),
            'deaths 65-74': parseFloat(vals[6]),
            'deaths 75-84': parseFloat(vals[7]),
            'deaths 85+': parseFloat(vals[8]),
            'deaths total': parseFloat(vals[9]),

            'rate 0-14': parseFloat(vals[10]),
            'rate 15-64': parseFloat(vals[11]),
            'rate 65-74': parseFloat(vals[12]),
            'rate 75-84': parseFloat(vals[13]),
            'rate 85+': parseFloat(vals[14]),
            'rate total': parseFloat(vals[15]),
        };
        switch (vals[3].trim().toLowerCase()) {
        case 'm': entry['male'] = data; break;
        case 'f': entry['female'] = data; break;
        case 'b': entry['total'] = data; break;
        default: logger.warn('unknown gender specifier in raw data source'); break;
        }
    }

    logger.info('restructure complete - caching result');
    CACHED_DATA = res;
    return res;
}

const mortality = {};

/**
 * Get all the mortality data - potentially a lot of data.
 * Only use this if you truly need access to all data.
 * This is an object organized by country, then by year, then by week, then broken down by gender.
 *
 * @returns {Array}
 */
mortality.getEverything = getData;

/**
 * Gets a list of all the countries represented in the data.
 * These are not the country names, but a unique identifier for them.
 *
 * @returns {Array}
 */
mortality.getCountries = async function() {
    return Object.keys(await getData());
};

/**
 * Gets all the data associated with the given country.
 * This is an object organized by year, then by week, then broken down by gender.
 * If the specified country is not in the data, returns an empty object (no rows).
 *
 * @param {String} country Name of the country to look up
 * @returns {Array}
 */
mortality.getDataForCountry = async function(country) {
    return (await getData())[country] || {};
};

/**
 * Gets all the data associated with the given country and year.
 * This is an object organized by week, then broken down by gender.
 * If the specified country and year are not in the data, returns an empty object (no rows).
 *
 * @param {String} country Country to look up
 * @param {Number} year Year to look up
 * @returns {Array}
 */
mortality.getDataForCountryAndYear = async function(country, year) {
    return (await this.getDataForCountry(country))[year] || {};
};

/**
 * Gets all the data associated with the given country, year, and week.
 * This is an object with data broken down by gender.
 * If the specified country, year, and week are not in the data, returns an empty object (no rows).
 *
 * @param {String} country Country to look up
 * @param {Number} year Year to look up
 * @param {BoundedNumber<1, 52>} week Week in year to look up
 * @returns {Array}
 */
mortality.getDataForCountryYearAndWeek = async function(country, year, week) {
    return (await this.getDataForCountryAndYear(country, year))[week] || {};
};

/**
 * Gets all the data associated with the given year.
 * This is an object organized by country, then by week, then broken down by gender.
 * If the specified year is not in the data, returns an empty object (no rows).
 *
 * @param {Number} year Year to look up
 * @returns {Array}
 */
mortality.getDataForYear = async function(year) {
    const data = await getData();
    const res = {};
    for (const country in data) {
        const vals = data[country][year];
        if (vals !== undefined) res[country] = vals;
    }
    return res;
};

/**
 * Gets all the data associated with the given year and week.
 * This is an object organized by country, then broken down by gender.
 * If the specified year and week are not in the data, returns an empty object (no rows).
 *
 * @param {Number} year Year to look up
 * @param {BoundedNumber<1, 52>} week Week in year to look up
 * @returns {Array}
 */
mortality.getDataForYearAndWeek = async function(year, week) {
    const data = await getData();
    const res = {};
    for (const country in data) {
        const temp = data[country][year];
        const vals = temp && temp[week];
        if (vals !== undefined) res[country] = vals;
    }
    return res;
};

module.exports = mortality;
/**
 * This service accesses data from the human mortality database,
 * which tabulates death rates broken down by age group and gender
 * for various countries.
 * For more information, see https://www.mortality.org/.
 * 
 * @alpha
 * @service
 * @category Science
 */
'use strict';

const logger = require('../utils/logger')('mortality');
const axios = require('axios');

// this is a direct download link to the CSV file - if you need details on the structure,
// download it, or check https://www.mortality.org/, which has much more detail.
const DATA_SOURCE = 'https://www.mortality.org/Public/STMF/Outputs/stmf.csv';

// maximum lifetime of any given download of DATA_SOURCE.
// downloads are cached for fast reuse, but will be discarded after this amount of time (milliseconds).
const DATA_SOURCE_LIFETIME = 1 * 24 * 60 * 60 * 1000; // 1 day

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

// year should be the full 4-digit year.
// day is the 0-based index of the day.
// so dateFromYearAndDay(2020, 0) is January 1, 2020
function dateFromYearAndDay(year, day) {
    return new Date(year, 0, day + 1);
}
function getDateString(date) {
    return `${(date.getMonth()+1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;
}

let CACHED_DATA = undefined;
let CACHE_TIME_STAMP = undefined;
async function getData() {
    if (CACHED_DATA !== undefined && Date.now() - CACHE_TIME_STAMP <= DATA_SOURCE_LIFETIME) return CACHED_DATA;

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
        const date = dateFromYearAndDay(year, (week - 1) * 7);
        const entry = dictPathOrEmptyInit(res, [country, getDateString(date)]);

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
        case 'b': entry['both'] = data; break;
        default: logger.warn('unknown gender specifier in raw data source'); break;
        }
    }

    logger.info('restructure complete - caching result');
    CACHED_DATA = res;
    CACHE_TIME_STAMP = Date.now();
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
mortality.getAllData = getData;

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
 *
 * @param {String} country Name of the country to look up
 * @returns {Array}
 */
mortality.getAllDataForCountry = async function(country) {
    const res = (await getData())[country];
    if (res === undefined) return this.response.status(400).send(`country '${country}' is not in the database`);
    else return res;
};

/**
 * Gets the time series data for the given country, filtered to the specified gender and category.
 *
 * @param {String} country Name of the country to look up
 * @param {String=} gender Gender group for filtering. Defaults to 'both'.
 * @param {String=} category Category for filtering. Defaults to 'deaths total'.
 * @returns {Array}
 */
mortality.getTimeSeries = async function(country, gender='both', category='deaths total') {
    const countryData = await this.getAllDataForCountry(country);
    const res = {};
    for (const date in countryData) {
        const genderData = countryData[date][gender];
        if (genderData === undefined) return this.response(400).send(`gender '${gender}' is not in the database`);
        const datum = genderData[category];
        if (datum === undefined) return this.response(400).send(`category '${category}' is not in the database`);
        res[date] = datum;
    }
    return res;
};

module.exports = mortality;
const logger = require('../../utils/logger')('COVID-19-USvaccination');
const axios = require('axios');

// this is a direct download link to the CSV file - if you need details on the structure,
// download it.
const DATA_SOURCE = 'https://raw.githubusercontent.com/owid/covid-19-data/master/public/data/vaccinations/us_state_vaccinations.csv';
const DATA_WORLD_SOURCE = 'https://raw.githubusercontent.com/owid/covid-19-data/master/public/data/vaccinations/vaccinations.csv';
// maximum lifetime of any given download of DATA_SOURCE.
// downloads are cached for fast reuse, but will be discarded after this amount of time (milliseconds).
const DATA_SOURCE_LIFETIME = 1 * 24 * 60 * 60 * 1000; // 1 day


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

function isGoodData(data){
    for(const key in data) {
        if (!data[key]) return false;
    }
    return true;
}


let CACHED_DATA = undefined;
let CACHE_TIME_STAMP = undefined;
async function getUSData() {
    if (CACHED_DATA !== undefined && Date.now() - CACHE_TIME_STAMP <= DATA_SOURCE_LIFETIME) return CACHED_DATA;

    logger.info(`requesting data from ${DATA_SOURCE}`);
    const resp = await axios({url: DATA_SOURCE, method: 'GET'});
    if (resp.status !== 200) {


        logger.error(`download failed with status ${resp.status}`);
        return {}; // return empty data set on failure
    }
    logger.info('download complete - restructuring data');

    const res = {};
    let first = true;
    for (const row of resp.data.split(/\r?\n/)) {
        if (first) {
            first = false;
            continue;
        }

        const vals = row.split(',');
        if (vals.length !== 14) continue;

        const rawDate = vals[0].split('-');
        const date = `${rawDate[1]}/${rawDate[2]}/${rawDate[0]}`;
        const state = vals[1];


        const data = {
            'total vaccinations': parseFloat(vals[2]),
            'total distributed': parseFloat(vals[3]),
            'people vaccinated': parseFloat(vals[4]),
            'people fully vaccinated per hundred': parseFloat(vals[5]),
            'total vaccinations per hundred': parseFloat(vals[6]),
            'people fully vaccinated': parseFloat(vals[7]),
            'people vaccinated per hundred': parseFloat(vals[8]),
            'distributed per hundred': parseFloat(vals[9]),
            'daily vaccinations raw': parseFloat(vals[10]),

            'daily vaccinations': parseFloat(vals[11]),
            'daily vaccinations per million': parseFloat(vals[12]),
            'share dose used': parseFloat(vals[13]),
        };

        if (!isGoodData(data)) continue;
        const entry = dictPathOrEmptyInit(res, [state, date]);
        for (const key in data) {
            entry [key] = data[key];
        }


    }



    logger.info('restructure complete - caching result');
    CACHED_DATA = res;
    CACHE_TIME_STAMP = Date.now();
    return res;
}

let CACHED_WORLD_DATA = undefined;
let CACHE_TIME_WORLD_STAMP = undefined;
async function getWorldData() {
    if (CACHED_WORLD_DATA !== undefined && Date.now() - CACHE_TIME_WORLD_STAMP <= DATA_SOURCE_LIFETIME) return CACHED_WORLD_DATA;

    logger.info(`requesting data from ${DATA_WORLD_SOURCE}`);
    const resp = await axios({url: DATA_WORLD_SOURCE, method: 'GET'});
    if (resp.status !== 200) {
        logger.error(`download failed with status ${resp.status}`);
        return {}; // return empty data set on failure
    }
    logger.info('download complete - restructuring data');

    const res = {};
    let first = true;
    for (const row of resp.data.split(/\r?\n/)) {
        if(first) {
            first = false;
            continue;
        }

        const vals = row.split(',');
        if (vals.length !== 12 ) continue;

        const country = vals[0];
        const countryCode = vals[0];
        const rawDate = vals[2].split('-');
        const date = `${rawDate[1]}/${rawDate[2]}/${rawDate[0]}`;

        const data = {
            'total vaccinations': parseFloat(vals[3]),
            'people vaccinated': parseFloat(vals[4]),
            'people fully vaccinated': parseFloat(vals[5]),
            'daily vaccinations raw': parseFloat(vals[6]),
            'daily vaccinations': parseFloat(vals[7]),
            'total vaccination per hundred': parseFloat(vals[8]),
            'people vaccinated per hundred': parseFloat(vals[9]),
            'people fully vaccinated per hundred':parseFloat(vals[10]),
            'daily vaccinations per million':parseFloat(vals[11]),
        };

        if(!isGoodData(data)) continue;
        const entry = dictPathOrEmptyInit(res, [country, date]);
        for (const key in data){
            entry [key] = data[key];
        }


    }



    logger.info('restructure complete - caching result');
    CACHED_WORLD_DATA= res;
    CACHED_WORLD_DATA = Date.now();
    return res;
}


module.exports = {getUSData, getWorldData};
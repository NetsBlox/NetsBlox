/**
 * Access to NOAA Earth System Research Laboratory data collected from Mauna Loa, Hawaii.
 *
 * See https://www.esrl.noaa.gov/gmd/ccgg/trends/ for additional details.
 *
 * @service
 * @category Science
 * @category Climate
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const logger = require('../utils/logger')('mauna-loa-co2');

const DATA_SOURCE = 'https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_mm_mlo.txt';
const DATA_SOURCE_LIFETIME = 1 * 24 * 60 * 60 * 1000; // 1 day

async function readFile() {
    const filename = path.join(__dirname, 'co2_mm_mlo.txt');
    return fs.readFile(filename, 'utf8');
}

let CACHED_DATA = undefined;
let CACHE_TIME_STAMP = undefined;
async function getData() {
    if (CACHED_DATA !== undefined && Date.now() - CACHE_TIME_STAMP <= DATA_SOURCE_LIFETIME) return CACHED_DATA;

    logger.info(`requesting data from ${DATA_SOURCE}`);
    const resp = await axios({url: DATA_SOURCE, method: 'GET'});
    let content, isFile = false;
    if (resp.status !== 200) {
        logger.error(`download failed with status ${resp.status}`);
        logger.error('falling back to saved file');
        content = await readFile();
        isFile = true;
    }
    else {
        logger.info('download complete - restructuring data');
        content = resp.data;
    }

    function restructure(content) {
        return content.split('\n')
            .map(s => s.trim())
            .filter(s => s && !s.startsWith('#'))
            .map(line => {
                const [,, date, interpolated, trend] = line.split(/\s+/).map(parseFloat);
                return {date, interpolated, trend};
            });
    }

    let res;
    try {
        res = restructure(content);
    }
    catch {
        logger.error('restructure failed - falling back to file data');
        if (!isFile) res = restructure(await readFile());
    }

    logger.info('restructure complete - caching result');
    CACHED_DATA = res;
    CACHE_TIME_STAMP = Date.now();
    return res;
}

const MaunaLoaCO2Data = {};
MaunaLoaCO2Data.serviceName = 'MaunaLoaCO2Data';

/**
 * Get the mole fraction of CO2 (in parts per million) by year. Missing measurements
 * are interpolated.
 *
 * If ``startyear`` or ``endyear`` is provided, only measurements within the given range will be returned.
 *
 * @param {Number=} startyear first year of data to include
 * @param {Number=} endyear last year of data to include
 * @returns {Array}
 */
MaunaLoaCO2Data.getRawCO2 = async function(startyear=-Infinity, endyear=Infinity){
    return (await getData()).filter(datum => datum.date > startyear && datum.date < endyear)
        .map(datum => [datum.date, datum.interpolated]);
};

/**
 * Get the mole fraction of CO2 (in parts per million) by year with the seasonal
 * cycle removed.
 *
 * If ``startyear`` or ``endyear`` is provided, only measurements within the given range will be returned.
 *
 * @param {Number=} startyear first year of data to include
 * @param {Number=} endyear last year of data to include
 * @returns {Array}
 */
MaunaLoaCO2Data.getCO2Trend = async function(startyear=-Infinity, endyear=Infinity){
    return (await getData()).filter(datum => datum.date > startyear && datum.date < endyear)
        .map(datum => [datum.date, datum.trend]);
};

module.exports = MaunaLoaCO2Data;

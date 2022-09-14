const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');

const logger = require('../../utils/logger')('mauna-loa-co2-data');

const DATA_SOURCE = 'https://gml.noaa.gov/webdata/ccgg/trends/co2/co2_mm_mlo.txt';
const DATA_SOURCE_LIFETIME = 1 * 24 * 60 * 60 * 1000; // 1 day

function restructure(content) {
    return content.split('\n')
        .map(s => s.trim())
        .filter(s => s && !s.startsWith('#'))
        .map(line => {
            const [,, date, interpolated, trend] = line.split(/\s+/).map(parseFloat);
            if (date < 1800 || date > 2200 || interpolated < 250 || interpolated > 1500 | trend < 250 || trend > 1500) {
                throw Error('CO2 data columns are not as expected - they might have changed the file organization');
            }
            return {date, interpolated, trend};
        });
}
async function loadDataFile() {
    const filename = path.join(__dirname, 'co2_mm_mlo.txt');
    return restructure(await fs.readFile(filename, 'utf8'));
}

let CACHED_DATA = undefined;
let CACHE_TIME_STAMP = undefined;
async function getData() {
    if (CACHED_DATA !== undefined && Date.now() - CACHE_TIME_STAMP <= DATA_SOURCE_LIFETIME) return CACHED_DATA;

    let res = await loadDataFile(); // default to the data file we have, in case the up-to-date download/restructure fails

    logger.info(`requesting data from ${DATA_SOURCE}`);
    const resp = await axios({url: DATA_SOURCE, method: 'GET'});
    if (resp.status !== 200) {
        logger.error('download failed with status', resp.status);
        logger.error('falling back to saved file');
    }
    else {
        logger.info('download complete - restructuring data');
        try {
            res = restructure(resp.data);
        }
        catch (err) {
            logger.error('restructure failed:', err);
            logger.error('falling back to saved file');
        }
    }

    logger.info('caching result');
    CACHED_DATA = res;
    CACHE_TIME_STAMP = Date.now();
    return res;
}

module.exports = {
    getData,
};

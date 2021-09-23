/**
 * The HurricaneData service provides access to the revised Atlantic hurricane
 * database (HURDAT2) from the National Hurricane Center (NHC).
 * 
 * For more information, check out https://www.aoml.noaa.gov/hrd/data_sub/re_anal.html
 *
 * @service
 * @category Science
 * @category Climate
 */
const fs = require('fs').promises;
const path = require('path');
const logger = require('../utils/logger')('hurricane');
const axios = require('axios');
const _ = require('lodash');

// UPDATE INFO - These are fallbacks for in case the live download/parsing of up to date data fails
// data files are available at https://www.nhc.noaa.gov/data/ under "Best Track Data (HURDAT2)"
// grab both the "Atlantic hurricane database" and "Northeast and North Central Pacific hurricane database" files
const FALLBACK_FILES = [
    'hurdat2-1851-2020-052921.txt',
    'hurdat2-nepac-1949-2020-043021a.txt',
];

const DATA_ROOT = 'https://www.nhc.noaa.gov/data/hurdat'

// maximum lifetime of any given downloaded resource.
// downloads are cached for fast reuse, but will be discarded after this amount of time (milliseconds).
const DATA_SOURCE_LIFETIME = 1 * 24 * 60 * 60 * 1000; // 1 day

function parseData(raw) {  // Load the hurricane data from the files
    let name = '';
    const res = [];
    const parseLine = function (type, line) {
        if (line.startsWith('AL') || line.startsWith('EP')){
            name = line.substring(19, 28).trim();
            return; // no actual data
        }
        
        res.push({ name,
            year: +line.substring(0, 4),
            month: line.substring(4,6),
            day: line.substring(6,8),
            time: line.substring(10,14),
            recordID: line.substring(15,17),
            status: line.substring(18,21).trim(),
            latitude: line.substring(23,27),
            longitude: '-' + line.substring(30,35).trim(),
            maxWind: line.substring(39,41),
            minPressure: line.substring(43,47).trim(),
        });
    };

    raw.split('\n').forEach(line => parseLine('AL', line));
    return res;
}

async function get(url) {
    logger.info(`requesting ${url}`);
    const resp = await axios({ url, method: 'GET' });
    if (resp.status !== 200) {
        logger.error(`download failed with status ${resp.status}`);
        throw Error(`failed to download ${url} (status ${resp.status})`);
    }
    logger.info('download complete');
    return resp.data;
}
function latestFile(files) {
    let latest = { name: '', month: -1, day: -1, year: -1 };
    for (const file of files) {
        if (file.year > latest.year) { latest = file; continue; }
        if (file.year < latest.year) continue;

        if (file.month > latest.month) { latest = file; continue; }
        if (file.month < latest.month) continue;

        if (file.day > latest.day) { latest = file; continue; }
        if (file.day < latest.day) continue;

        if (file.name.length > latest.name.length) latest = file; // sometimes they have <name>.txt and <name>a.txt, etc.
    }
    if (latest.name.length === 0) throw Error('no files found');
    return latest;
}

let CACHED_DATA = undefined;
let CACHE_TIME_STAMP = undefined;
async function getData() {
    if (CACHED_DATA !== undefined && Date.now() - CACHE_TIME_STAMP <= DATA_SOURCE_LIFETIME) return CACHED_DATA;

    let res = [];
    try {
        const index = await get(DATA_ROOT);

        const baseFile = latestFile(Array.from(
            index.matchAll(/href=['"](hurdat2-\d{4}-\d{4}-(\d{2})(\d{2})(\d{2})[^'"]*\.txt)['"]/g),
            x => {return {name: x[1], month: +x[2], day: +x[3], year: +x[4]}; }
        ));
        logger.info(`found base file: ${baseFile.name} (${baseFile.month}/${baseFile.day}/20${baseFile.year})`);

        const nepacFile = latestFile(Array.from(
            index.matchAll(/href=['"](hurdat2-nepac-\d{4}-\d{4}-(\d{2})(\d{2})(\d{2})[^'"]*\.txt)['"]/g),
            x => {return {name: x[1], month: +x[2], day: +x[3], year: +x[4]}; }
        ));
        logger.info(`found nepac file: ${nepacFile.name} (${nepacFile.month}/${nepacFile.day}/20${nepacFile.year})`);

        const raw = await get(`${DATA_ROOT}/${baseFile.name}`) + await get(`${DATA_ROOT}/${nepacFile.name}`);
        res = parseData(raw);
    }
    catch (err) {
        logger.error(`failed to load up-to-date data (${err})`);
        logger.error('falling back to local files');

        const pieces = await Promise.all(FALLBACK_FILES.map(name => fs.readFile(path.join(__dirname, name), 'utf8')));
        const raw = pieces.reduce((a, b) => a + b);
        res = parseData(raw);
    }

    logger.info('restructure complete - caching result');
    CACHED_DATA = res;
    CACHE_TIME_STAMP = Date.now();
    return res;
}

const HurricaneData = {};

/**
 * Get hurricane data including location, maximum winds, and central pressure.
 *
 * @param {string} name - name of the hurricane
 * @param {BoundedNumber<1850,2020>} year - year that the hurricane occurred in
 * @returns {Array<Object>} - All recorded data for the given hurricane
 */
HurricaneData.getHurricaneData = async function(name, year){
    name = name.toUpperCase();
    const measurements = (await getData())
        .filter(data => data.name === name && data.year == year);

    return measurements;
};

/**
 * Get the names of all hurricanes occurring in the given year.
 *
 * @param {BoundedNumber<1850,2020>} year
 * @returns {Array<String>} names
 */

HurricaneData.getHurricanesInYear = async function(year){
    const names = (await getData())
        .filter(data => data.year == year)
        .map(data => data.name);

    return _.uniq(names);
};

/**
 * Get the years in which a hurricane with the given name occurred.
 *
 * @param {String} name - name of the hurricane to find the year(s) of
 * @returns {Array<Number>} years - list with all of the years that a particular name has been used for a hurricane
 */
HurricaneData.getYearsWithHurricaneNamed = async function(name){
    name = name.toUpperCase();
    const years = (await getData())
        .filter(data => data.name == name)
        .map(data => data.year);

    return _.uniq(years);
};

module.exports = HurricaneData;

/**
 * Access to NOAA Global Pliocene-Pleistocene Benthic d18O Stack.
 *
 * For more information, check out
 * https://www.ncdc.noaa.gov/paleo-search/study/5847
 *
 * Original datasets are available at
 * https://www1.ncdc.noaa.gov/pub/data/paleo/contributions_by_author/lisiecki2005/lisiecki2005.txt
 * @alpha
 * @service
 * @category Science
 * @category Climate
 */
const fs = require('fs');
const path = require('path');

const Icesheets = {};
Icesheets._data1 = [];
Icesheets._data2 = [];
Icesheets._data3 = [];

// converting time to year CE
let timeConversion = function(time) {
    return (1950 - 1000*time);
}

// reading and importing delta 18O data
const importdata1 = function(line) {
    let [time, d180, error] = line.trim().split(/\s+/);
    let adjustTime = timeConversion(time);
    Icesheets._data1.push({adjustTime, d180, error});
}

// reading and importing Sedimentation Rate data
const importdata2 = function(line) {
    let [time, averagedSedRates, normalizedSedRates] = line.trim().split(/\s+/);
    let adjustTime = timeConversion(time);
    Icesheets._data2.push({adjustTime, averagedSedRates, normalizedSedRates});
}

// reading and importing time data
const importdata3 = function(line) {
    let elements = line.trim().split(/\s+/);
    let s95; 
    let LR04a;
    if(elements.length == 6) {
        s95 = elements[2];
        LR041 = elements[3];
        let specMap = elements[4];
        let LR04b = elements[5];
        Icesheets._data3.push({s95,LR04a,specMap,LR04b});
    } else if(elements.length == 4) {
        s95 = elements[2];
        LR041 = elements[3];
        Icesheets._data3.push({s95,LR04a});
    } else {
        s95 = elements[0];
        LR041 = elements[1];
        Icesheets._data3.push({s95,LR04a});
    }
}

fs.readFileSync(path.join(__dirname, 'Pliocene-Pleistocene Benthic d18O Stack.txt'), 'utf8')
    .split('\n')
    .forEach(line=>importdata1(line));

fs.readFileSync(path.join(__dirname, 'Sedimentation Rates.txt'), 'utf8')
    .split('\n')
    .forEach(line=>importdata2(line));

fs.readFileSync(path.join(__dirname, 'Age model Conversion.txt'), 'utf8')
    .split('\n')
    .forEach(line=>importdata3(line));

/**
 * Get delta 18O value.
 *
 * If a start and end year is provided, only measurements within the given range will be
 * returned.
 *
 * @param {Number=} startyear Year to begin data at
 * @param {Number=} endyear Year to begin data at
 * @returns {Array} delta 18O
 */
Icesheets.getd180 = function(startyear, endyear) {
    return this._data1
        .map(data => [data.adjustTime, data.d180])
        .filter(data => data[0] >= startyear && data[0] <= endyear);
}

/**
 * Get delta 18O error value.
 *
 * If a start and end year is provided, only measurements within the given range will be
 * returned.
 *
 * @param {Number=} startyear Year to begin data at
 * @param {Number=} endyear Year to begin data at
 * @returns {Array} delta 18O error
 */
Icesheets.getd180error = function(startyear, endyear) {
    return this._data1
        .map(data => [data.adjustTime, data.error])
        .filter(data => data[0] >= startyear && data[0] <= endyear);
}

/**
 * Get average sedimentation rate value.
 *
 * If a start and end year is provided, only measurements within the given range will be
 * returned.
 *
 * @param {Number=} startyear Year to begin data at
 * @param {Number=} endyear Year to begin data at
 * @returns {Array} average sedimentation rate
 */
Icesheets.getAveSedRates = function(startyear, endyear) {
    return this._data2
        .map(data => [data.adjustTime, data.averagedSedRates])
        .filter(data => data[0] >= startyear && data[0] <= endyear);
}

/**
 * Get normalized sedimentation rate value.
 *
 * If a start and end year is provided, only measurements within the given range will be
 * returned.
 *
 * @param {Number=} startyear Year to begin data at
 * @param {Number=} endyear Year to begin data at
 * @returns {Array} normalized sedimentation rate
 */
Icesheets.getNormalizedSedRates = function(startyear, endyear) {
    return this._data2
        .map(data => [data.adjustTime, data.normalizedSedRates])
        .filter(data => data[0] >= startyear && data[0] <= endyear);
}

/**
 * Get s95 time.
 *
 * If a start and end year is provided, only measurements within the given range will be
 * returned.
 *
 * @param {Number=} startyear Year to begin data at
 * @param {Number=} endyear Year to begin data at
 * @returns {Array} s95 time
 */
Icesheets.gets95Time = function() {
    return this._data3
        .map(data => [data.s95, data.LR04a]);
}

/**
 * Get specMap time.
 *
 * If a start and end year is provided, only measurements within the given range will be
 * returned.
 *
 * @param {Number=} startyear Year to begin data at
 * @param {Number=} endyear Year to begin data at
 * @returns {Array} specMap time
 */
Icesheets.getsspecMapTime = function() {
    return this._data3
        .map(data => [data.specMap, data.LR04b]);
}

module.exports = Icesheets;
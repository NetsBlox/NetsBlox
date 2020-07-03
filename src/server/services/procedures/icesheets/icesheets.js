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

// this contains delta 18O data, which is a ratio of two oxygen isotopes in deep ocean sediments
Icesheets._dataDelta18O = [];

// this contains sedimentation rate data, which is a formation rate that is the amount of sediment 
// deposited during a certain time span, normally expressed as a length per time (e.g., cm/yr).
Icesheets._dataSedim = [];

// Initialize startyear to -5000000 CE and endyear to 0 CE if no inputs are given.
let checkInputYear = function(startyear, endyear) {
    if(startyear == null) {
        startyear = -5000000;
    }
    if(endyear == null) {
        endyear = 0;
    }
    return [startyear, endyear];
}

// converting time to year CE, note: the present is 1950 here because we are using the BP present
let timeConversion = function(time) {
    return (1950 - 1000*time);
};

// reading and importing delta 18O data
const importdelta18O = function(line) {
    let [time, d180, error] = line.trim().split(/\s+/);
    let adjustTime = timeConversion(time);
    Icesheets._dataDelta18O.push({adjustTime, d180, error});
};

// reading and importing Sedimentation Rate data
const importSedim = function(line) {
    let [time, averagedSedRates, normalizedSedRates] = line.trim().split(/\s+/);
    let adjustTime = timeConversion(time);
    Icesheets._dataSedim.push({adjustTime, averagedSedRates, normalizedSedRates});
};

fs.readFileSync(path.join(__dirname, 'Pliocene-Pleistocene Benthic d18O Stack.txt'), 'utf8')
    .split('\n')
    .forEach(line=>importdelta18O(line));

fs.readFileSync(path.join(__dirname, 'Sedimentation Rates.txt'), 'utf8')
    .split('\n')
    .forEach(line=>importSedim(line));

/**
 * Get delta 18O value (unit: per mill. It is a parts per thousand unit, often used directly to 
 * refer to isotopic ratios and calculated by calculating the ratio of isotopic concentrations in 
 * a sample and in a standard, subtracting one and multiplying by one thousand).
 *
 * If a start and end year is provided, only measurements within the given range will be
 * returned.
 *
 * @param {Number=} startyear Year to begin data at
 * @param {Number=} endyear Year to begin data at
 * @returns {Array} delta 18O
 */
Icesheets.getDelta18O = function(startyear, endyear) {
    [startyear,endyear] = checkInputYear(endyear,startyear);
    return this._dataDelta18O
        .map(data => [data.adjustTime, data.d180])
        .filter(data => data[0] >= startyear && data[0] <= endyear);
};

/**
 * Get delta 18O error value (unit: per mill).
 *
 * If a start and end year is provided, only measurements within the given range will be
 * returned.
 *
 * @param {Number=} startyear Year to begin data at
 * @param {Number=} endyear Year to begin data at
 * @returns {Array} delta 18O error
 */
Icesheets.getDelta18OError = function(startyear, endyear) {
    [startyear,endyear] = checkInputYear(endyear,startyear);
    return this._dataDelta18O
        .map(data => [data.adjustTime, data.error])
        .filter(data => data[0] >= startyear && data[0] <= endyear);
};

/**
 * Get average sedimentation rate value (unit: centimeter per kiloyear).
 *
 * If a start and end year is provided, only measurements within the given range will be
 * returned.
 *
 * @param {Number=} startyear Year to begin data at
 * @param {Number=} endyear Year to begin data at
 * @returns {Array} average sedimentation rate
 */
Icesheets.getAverageSedimentationRates = function(startyear, endyear) {
    [startyear,endyear] = checkInputYear(endyear,startyear);
    return this._dataSedim
        .map(data => [data.adjustTime, data.averagedSedRates])
        .filter(data => data[0] >= startyear && data[0] <= endyear);
};

/**
 * Get normalized sedimentation rate value (unit: dimensionless).
 *
 * If a start and end year is provided, only measurements within the given range will be
 * returned.
 *
 * @param {Number=} startyear Year to begin data at
 * @param {Number=} endyear Year to begin data at
 * @returns {Array} normalized sedimentation rate
 */
Icesheets.getNormalizedSedimentaionRates = function(startyear, endyear) {
    [startyear,endyear] = checkInputYear(endyear,startyear);
    return this._dataSedim
        .map(data => [data.adjustTime, data.normalizedSedRates])
        .filter(data => data[0] >= startyear && data[0] <= endyear);
};

module.exports = Icesheets;
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
const assert = require('assert');

const PaleoceanOxygenIsotopes = {};

// this contains delta 18O data, which is a ratio of two oxygen isotopes in deep ocean sediments
PaleoceanOxygenIsotopes._dataDelta18O = [];

// this contains sedimentation rate data, which is a formation rate that is the amount of sediment 
// deposited during a certain time span, normally expressed as a length per time (e.g., cm/yr).
PaleoceanOxygenIsotopes._dataSedim = [];

// converting time to year CE, note: the present is 1950 here because we are using the BP present
let timeConversion = function(time) {
    return (1950 - 1000*time);
};

const importDelta18OData = function(line) {
    let [time, d18O, error] = line.trim().split(/\s+/);
    [time, d18O, error].forEach(value=>assert(!isNaN(Number(value))));
    let adjustTime = timeConversion(time);
    PaleoceanOxygenIsotopes._dataDelta18O.push({adjustTime, d18O, error});
};

const importSedimentationRatesData = function(line) {
    let [time, averagedSedRates, normalizedSedRates] = line.trim().split(/\s+/);
    [time, averagedSedRates, normalizedSedRates].forEach(value=>assert(!isNaN(Number(value))));
    let adjustTime = timeConversion(time);
    PaleoceanOxygenIsotopes._dataSedim.push({adjustTime, averagedSedRates, normalizedSedRates});
};

fs.readFileSync(path.join(__dirname, 'Pliocene-Pleistocene Benthic d18O Stack.txt'), 'utf8')
    .split('\n')
    .forEach(line=>importDelta18OData(line));

fs.readFileSync(path.join(__dirname, 'Sedimentation Rates.txt'), 'utf8')
    .split('\n')
    .forEach(line=>importSedimentationRatesData(line));

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
PaleoceanOxygenIsotopes.getDelta18O = function(startyear = -Infinity, endyear = Infinity) {
    return this._dataDelta18O
        .map(data => [data.adjustTime, data.d18O])
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
PaleoceanOxygenIsotopes.getDelta18OError = function(startyear = -Infinity, endyear = Infinity) {
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
PaleoceanOxygenIsotopes.getAverageSedimentationRates = function(startyear = -Infinity, endyear = Infinity) {
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
PaleoceanOxygenIsotopes.getNormalizedSedimentationRates = function(startyear = -Infinity, endyear = Infinity) {
    return this._dataSedim
        .map(data => [data.adjustTime, data.normalizedSedRates])
        .filter(data => data[0] >= startyear && data[0] <= endyear);
};

module.exports = PaleoceanOxygenIsotopes;
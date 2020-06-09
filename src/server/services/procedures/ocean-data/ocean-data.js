/**
 * The OceanData service provides access to scientific ocean data including
 * temperature and sea level.
 *
 * For more information, check out:
 *              http://www.columbia.edu/~mhs119/Sensitivity+SL+CO2/
 *     https://www.paleo.bristol.ac.uk/~ggdjl/warm_climates/hansen_etal.pdf.
 *
 * @service
 * @category Science
 * @category Climate
 */
const OceanData = {};
OceanData._data = require('./data');

/**
 * Get historical oxygen isotope ratio values by year.
 *
 * @returns {Array} ratios - a list of oxygen isotope ratios by year
 */
OceanData.getOxygenRatio = function(){
    return this._data
        .map(data => [data.year, data.oxygenIsotopeRatio]);
};

/**
 * Get historical deep ocean temperatures in Celsius by year.
 *
 * @returns {Array} temperatures - a list of deep ocean temperatures by year
 */
OceanData.getDeepOceanTemp = function(){
    return this._data
        .map(data => [data.year, data.deepOceanTemp]);
};

/**
 * Get historical surface ocean temperatures in Celsius by year.
 *
 * @returns {Array} temperatures - a list of surface ocean temperatures by year
 */
OceanData.getSurfaceTemp = function(){
    return this._data
        .map(data => [data.year, data.surfaceTemp]);
};

/**
 * Get historical sea level in meters by year.
 *
 * @returns {Array} meters - change in sea level (in meters) by year
 */
OceanData.getSeaLevel = function(){
    return this._data
        .map(data => [data.year, data.seaLevel]);
};

module.exports = OceanData;

/**
 * The OceanData service provides access to scientific ocean data including
 * temperature and sea level.
 *
 * For more information, check out:
 * 
 * - http://www.columbia.edu/~mhs119/Sensitivity+SL+CO2/
 * - https://www.paleo.bristol.ac.uk/~ggdjl/warm_climates/hansen_etal.pdf.
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
 * If ``startYear`` or ``endYear`` is provided, only measurements within the given range will be returned.
 * 
 * @param {Number=} startYear earliest year to include in results
 * @param {Number=} endYear latest year to include in results
 * @returns {Array} a list of oxygen isotope ratios by year
 */
OceanData.getOxygenRatio = function(startYear = -Infinity, endYear = Infinity){
    return this._data
        .filter(data => startYear <= data.year && data.year <= endYear)
        .map(data => [data.year, data.oxygenIsotopeRatio]);
};

/**
 * Get historical deep ocean temperatures in Celsius by year.
 *
 * If ``startYear`` or ``endYear`` is provided, only measurements within the given range will be returned.
 * 
 * @param {Number=} startYear earliest year to include in results
 * @param {Number=} endYear latest year to include in results
 * @returns {Array} a list of deep ocean temperatures by year
 */
OceanData.getDeepOceanTemp = function(startYear = -Infinity, endYear = Infinity){
    return this._data
        .filter(data => startYear <= data.year && data.year <= endYear)
        .map(data => [data.year, data.deepOceanTemp]);
};

/**
 * Get historical surface ocean temperatures in Celsius by year.
 *
 * If ``startYear`` or ``endYear`` is provided, only measurements within the given range will be returned.
 * 
 * @param {Number=} startYear earliest year to include in results
 * @param {Number=} endYear latest year to include in results
 * @returns {Array} a list of surface ocean temperatures by year
 */
OceanData.getSurfaceTemp = function(startYear = -Infinity, endYear = Infinity){
    return this._data
        .filter(data => startYear <= data.year && data.year <= endYear)
        .map(data => [data.year, data.surfaceTemp]);
};

/**
 * Get historical sea level in meters by year.
 *
 * If ``startYear`` or ``endYear`` is provided, only measurements within the given range will be returned.
 * 
 * @param {Number=} startYear earliest year to include in results
 * @param {Number=} endYear latest year to include in results
 * @returns {Array} a list of change in sea level (in meters) by year
 */
OceanData.getSeaLevel = function(startYear = -Infinity, endYear = Infinity){
    return this._data
        .filter(data => startYear <= data.year && data.year <= endYear)
        .map(data => [data.year, data.seaLevel]);
};

module.exports = OceanData;

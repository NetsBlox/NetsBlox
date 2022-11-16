/**
 * Access to NOAA Earth System Research Laboratory data collected from Mauna Loa, Hawaii.
 *
 * See https://www.esrl.noaa.gov/gmd/ccgg/trends/ for additional details.
 *
 * @service
 * @category Climate
 */

const {getData} = require('./data');

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

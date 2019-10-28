/**
 * Access to NOAA Earth System Research Laboratory data collected from Mauna Loa, Hawaii.
 *
 * See https://www.esrl.noaa.gov/gmd/ccgg/trends/ for additional details.
 *
 * @alpha
 * @service
 * @category Science
 * @category Climate
 */
const data = (function() {
    const fs = require('fs');
    const path = require('path');
    const filename = path.join(__dirname,'co2_mm_mlo.txt');
    const lines = fs.readFileSync(filename, 'utf8').split('\n');

    while (lines[0].startsWith('#')) {
        lines.shift();
    }
    return lines.map(line => {
        const [,, date, avg, interpolated, trend] = line.split(/\s+/)
            .map(txt => parseFloat(txt));
        return {date, avg, interpolated, trend};
    });
})();

const HawaiiCO2Data = {};
HawaiiCO2Data.serviceName = 'HawaiiCO2Data';

/**
 * Get the mole fraction of CO2 (in parts per million) by year. Missing measurements
 * are interpolated.
 *
 * If a start and end year is provided, only measurements within the given range will be
 * returned.
 *
 * @param {Number=} startyear Year to begin data at
 * @param {Number=} endyear Year to begin data at
 * @returns {Array}
 */
HawaiiCO2Data.getCarbonDioxideData = function(startyear=-Infinity, endyear=Infinity){
    return data.filter(datum => datum.date > startyear && datum.date < endyear)
        .map(datum => [datum.date, datum.interpolated]);
};

/**
 * Get the mole fraction of CO2 (in parts per million) by year with the seasonal
 * cycle removed.
 *
 * If a start and end year is provided, only measurements within the given range will be
 * returned.
 *
 * @param {Number=} startyear Year to begin data at
 * @param {Number=} endyear Year to begin data at
 * @returns {Array}
 */
HawaiiCO2Data.getCO2TrendData = function(startyear=-Infinity, endyear=Infinity){
    return data.filter(datum => datum.date > startyear && datum.date < endyear)
        .map(datum => [datum.date, datum.trend]);
};

module.exports = HawaiiCO2Data;

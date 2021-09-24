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
const fs = require('fs');
const path = require('path');
const _ = require('lodash');

// UPDATE INFO
// data files are available at https://www.nhc.noaa.gov/data/ under "Best Track Data (HURDAT2)"
// grab both the "Atlantic hurricane database" and "Northeast and North Central Pacific hurricane database" files
const dataFiles = [
    'hurdat2-1851-2020-052921.txt',
    'hurdat2-nepac-1949-2020-043021a.txt',
];

const HurricaneData = {};
HurricaneData._data = [];

(function() {  // Load the hurricane data from the files
    let name = '';
    const parseLine = function (type, line) {
        if (line.startsWith('AL') || line.startsWith('EP')){
            name = line.substring(19, 28).trim();
        } else {
            let year = +line.substring(0, 4);
            let month = line.substring(4,6);
            let day = line.substring(6,8);
            let time = line.substring(10,14);
            let recordID = line.substring(15,17);
            let status = line.substring(18,21).trim();
            let latitude = line.substring(23,27);
            let longitude = '-' + line.substring(30,35).trim();
            let maxWind = line.substring(39,41);
            let minPressure = line.substring(43,47).trim();

            HurricaneData._data.push({name, year, month, day, time, recordID, status,
                latitude, longitude, maxWind, minPressure});
        }
    };

    dataFiles.map(name => fs.readFileSync(path.join(__dirname, name), 'utf8'))
        .reduce((text1, text2) => text1 + text2)
        .split('\n')
        .forEach(line => parseLine('AL', line));
})();

/**
 * Get hurricane data including location, maximum winds, and central pressure.
 *
 * @param {string} name - name of the hurricane
 * @param {BoundedNumber<1850,2020>} year - year that the hurricane occurred in
 * @returns {Array<Object>} - All recorded data for the given hurricane
 */
HurricaneData.getHurricaneData = function(name, year){
    name = name.toUpperCase();
    const measurements = HurricaneData._data
        .filter(data => data.name === name && data.year == year);

    return measurements;
};

/**
 * Get the names of all hurricanes occurring in the given year.
 *
 * @param {BoundedNumber<1850,2020>} year
 * @returns {Array<String>} names
 */

HurricaneData.getHurricanesInYear = function(year){
    const names = HurricaneData._data
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
HurricaneData.getYearsWithHurricaneNamed = function(name){
    name = name.toUpperCase();
    const years = HurricaneData._data
        .filter(data => data.name == name)
        .map(data => data.year);

    return _.uniq(years);
};

module.exports = HurricaneData;

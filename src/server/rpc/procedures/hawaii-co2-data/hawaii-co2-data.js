const fs = require('fs');
const path = require('path');

const table = [
    ['Year', 'Month', 'Interpolated ppm', 'Seasonally adjusted ppm']
];
const table1 = [
    ['Year', 'Month', 'Interpolated ppm']
];
const table2 = [
    ['Year', 'Month', 'Seasonally adjusted ppm']
];

fs.readFileSync(path.join(__dirname,'co2_mm_mlo.txt'), 'utf8').split('\n')
    .forEach(function (line) {
        if (!line.startsWith('#')) {
            let year = line.substring(0, 4);
            let month = line.substring(4, 8).trim();
            let inter = line.substring(38, 44);
            let season = line.substring(50, 56);
            let wholeArr = [year, month, inter, season];
            let interpolatedArr = [year, month, inter];
            let seasonalArr = [year, month, season];
            table.push(wholeArr);
            table1.push(interpolatedArr);
            table2.push(seasonalArr);
        }
    });

const co2service = {};

co2service.serviceName = 'HawaiiCO2Data';

/**
 * displays a table listing the year, month, and interpolated ppm values
 * @returns {array} table displaying the years and months from March 1958 to April 2019 and the corresponding interpolated ppm values
 */
co2service.getInterpolated = function(){
    return table1;
};

/**
 *displays a table listing the year, month, and seasonally adjusted ppm values
 * @returns {array} table displaying the years and months from March 1958 to April 2019 and the corresponding seasonal ppm values
 */
co2service.getSeasonal = function(){
    return table2;
};

/**
 *displays a table listing the year, month, interpolated ppm values, and seasonally adjusted ppm values
 * @returns {array} table displaying the years and months from March 1958 to April 2019 and the corresponding interpolated and seasonal ppm values
 */
co2service.getWhole = function(){
    return table;
};

/**
 * returns the specified ppm value after inputting the year, month, and type of data
 * @param {BoundedNumber<1958,2019>} year - year between 1958 and 2019 to return the selected ppm of
 * @param {BoundedNumber<1,12>=} month - numerical value of the month to return the selected ppm of
 * @param {string} type - select which type of data to be returned, either "seasonal" or "interpolated"
 * @returns {String} ppm value - the selected type of ppm that matches the given year and month
 */
co2service.getPPM = function(year, month, type) {
    let ppm = '';
    const ppmTable = [['Year', 'Month', 'ppm']];
    let result = this.getWhole(type);

    if (month === ''){
        result = result.filter(function(value) {
            return value[0] === year.toString();
        });

        result = result.map(function(value){

            if (type.toUpperCase() === 'SEASONAL'){
                return [value[0], value[1], value[3]];
            }
            else if (type.toUpperCase() === 'INTERPOLATED'){
                return [value[0], value[1], value[2]];
            }

            return value[0];
        });

        return [...ppmTable, ...result];
    } else {
        result.forEach(function (value) {
            if (value[0] === year.toString() && value[1] === month.toString())
                if (type.toUpperCase() === 'INTERPOLATED') {
                    ppm = value[2];
                }
                else if (type.toUpperCase() === 'SEASONAL'){
                    ppm = value[3];
                }
        });
    }
    return ppm;
};

module.exports = co2service;

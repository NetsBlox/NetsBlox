const lineReader = require('line-reader');
const path = require('path');
const logger = require('../utils/logger')('hawaii-co2-data');

const table = [
    ['Year', 'Month', 'Interpolated ppm', 'Seasonally adjusted ppm']
];
const table1 = [
    ['Year', 'Month', 'Interpolated ppm']
];
const table2 = [
    ['Year', 'Month', 'Seasonally adjusted ppm']
];

const co2service = {};

co2service.serviceName = 'CO2Data';

/**
 *displays a table listing the year, month, and interpolated ppm values
 * @returns {array} table displaying the years and months from March 1958 to April 2019 and the corresponding interpolated ppm values
 */

co2service.getInterpolated = function(){
    lineReader.eachLine(path.join(__dirname,'co2_mm_mlo.txt'), function (line) {
        if (line.startsWith('#')) {
            //pass
        } else {
            let year = line.substring(0, 4);
            let month = line.substring(4, 8).trim();
            let inter = line.substring(38, 44);
            let localArr = [year, month, inter/*, season*/];
            table1.push(localArr);
        }});
    return table1;
};

/**
 *displays a table listing the year, month, and seasonally adjusted ppm values
 * @returns {array} table displaying the years and months from March 1958 to April 2019 and the corresponding seasonal ppm values
 */

co2service.getSeasonal = function(){
    lineReader.eachLine(path.join(__dirname,'co2_mm_mlo.txt'), function (line) {
        if (line.startsWith('#')) {
            //pass
        } else {
            let year = line.substring(0, 4);
            let month = line.substring(4, 8).trim();
            let season = line.substring(50, 56);
            let localArr = [year, month/*, inter*/, season];
            table2.push(localArr);
        }});
    return table2;
};

/**
 *displays a table listing the year, month, interpolated ppm values, and seasonally adjusted ppm values
 * @returns {array} table displaying the years and months from March 1958 to April 2019 and the corresponding interpolated and seasonal ppm values
 */

co2service.getWhole = function(){
    lineReader.eachLine(path.join(__dirname,'co2_mm_mlo.txt'), function (line) {
        if (line.startsWith('#')) {
            //pass
        } else {
            let year = line.substring(0, 4);
            let month = line.substring(4, 8).trim();
            let inter = line.substring(38, 44);
            let season = line.substring(50, 56);
            let localArr = [year, month, inter, season];
            table.push(localArr);
        }});
    return table;
};
/**
 *returns the specified ppm value after inputting the year, month, and type of data
 * @param {BoundedNumber<1958,2019>} year - year between 1958 and 2019 to return the selected ppm of
 * @param {BoundedNumber<1,12>=} month - numerical value of the month to return the selected ppm of
 * @param {string} type - select which type of data to be returned, either "seasonal" or "interpolated"
 * @returns {string} ppm value - the selected type of ppm that matches the inputted year and month
 */
co2service.getPPM = function(year, month, type) {
    let ppm = '';
    const ppmTable = [['Year', 'Month', 'ppm']];
    let result = this.getWhole(type);
    let result1 = this.getInterpolated(type);
    let result2 = this.getSeasonal(type);
    if (month === ''){
        return (new Promise(function(resolve, reject) {
            lineReader.eachLine(path.join(__dirname,'co2_mm_mlo.txt'), function (line) {
                if (line.startsWith(year)) {
                    if (type.toUpperCase() === 'SEASONAL') {
                        ppm = line.substring(50, 56);
                        let year = line.substring(0,4);
                        let month = line.substring(4,8).trim();
                        let localArr = [year, month, ppm];
                        ppmTable.push(localArr);
                    } else if (type.toUpperCase() === 'INTERPOLATED') {
                        ppm = line.substring(38, 44);
                        let year = line.substring(0,4);
                        let month = line.substring(4,8).trim();
                        let localArr = [year, month, ppm];
                        ppmTable.push(localArr);
                    }
                    logger.debug(ppmTable);
                }
            }, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        })).then(function() {
            return ppmTable;
        });

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
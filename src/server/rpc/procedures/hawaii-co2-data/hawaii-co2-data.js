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
 *displays a table listing the year and month, and the corresponding interpolated and seasonal ppm values
 * @returns {array} table displaying the years and months from March 1958 to April 2019 and the data type inputted
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

co2service.getPPM = function(year, month, type) {
    let ppm = '';
    const ppmTable = [[year, month, ppm]];
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
//pass


/**
 *displays the different message options that can be entered into the text field parameters of related RPCs
 * @returns {array} array - shows the different values that can be inputted into the "text" fields of the various related RPCs
 */
co2service.showTypes = function(){
    return ['seasonal', 'interpolated', 'whole'];
};

module.exports = co2service;
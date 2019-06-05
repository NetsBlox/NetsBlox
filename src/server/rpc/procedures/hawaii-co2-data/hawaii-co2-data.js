const lineReader = require('line-reader');
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

const co2service = {};

co2service.serviceName = 'CO2Data';
/**
 *displays a table listing the year and month, and the corresponding interpolated and seasonal ppm values
 * @param {string} text - select which columns to display in the table, either "whole," "seasonal", or "interpolated"
 * @returns {array} table displaying the years and months from March 1958 to April 2019 and the data type inputted
 */
co2service.getTable = function(text){
    lineReader.eachLine(path.join(__dirname,'co2_mm_mlo.txt'), function (line) {
        if (line.startsWith('#')) {
            //pass
        } else if (text.toUpperCase() === 'INTERPOLATED'){

            let year = line.substring(0, 4);
            let month = line.substring(4, 8).trim();
            let inter = line.substring(38, 44);
            let localArr = [year, month, inter/*, season*/];
            table1.push(localArr);
        } else if (text.toUpperCase() === 'SEASONAL') {
            let year = line.substring(0, 4);
            let month = line.substring(4, 8).trim();
            let season = line.substring(50, 56);
            let localArr = [year, month/*, inter*/, season];
            table2.push(localArr);
        } else if (text.toUpperCase() === 'WHOLE') {
            let year = line.substring(0, 4);
            let month = line.substring(4, 8).trim();
            let inter = line.substring(38, 44);
            let season = line.substring(50, 56);
            let localArr = [year, month, inter, season];
            table.push(localArr);
        }
    });

    switch (text.toUpperCase()) {
    case 'WHOLE':
        return table;
    case 'INTERPOLATED':
        return table1;
    case 'SEASONAL':
        return table2;
    default:
        return [['Invalid text']];
    }
};
/**
 *returns the specified ppm value after inputting the year, month, and type of data
 * @param {BoundedNumber<1958,2019>} year - year between 1958 and 2019 to return the selected ppm of
 * @param {BoundedNumber<1,12>} month - numerical value of the month to return the selected ppm of
 * @param {string} type - select which type of data to be returned, either "seasonal" or "interpolated"
 * @returns {string} ppm value - the selected type of ppm that matches the inputted year and month
 */
co2service.getPPM = function(year, month, type) {
    let result = this.getTable(type);
    let ppm = '';
    result.forEach(function (value) {
        if (value[0] === year.toString() && value[1] === month.toString())
            ppm = value[2];
    });
    return ppm;
};
/**
 *displays the different message options that can be entered into the text field parameters of related RPCs
 * @returns {array} array - shows the different values that can be inputted into the "text" fields of the various related RPCs
 */
co2service.showTypes = function(){
    return ['seasonal', 'interpolated', 'whole'];
};

module.exports = co2service;
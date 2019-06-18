const lineReader = require('line-reader');
const path = require('path');

const table = [
    ['name', 'year', 'month', 'day', 'time', 'recordID', 'status', 'latitude', 'longitude', 'maxWind', 'minPressure']
];

let name = '';

lineReader.eachLine(path.join(__dirname,'hurdat2-1851-2018-051019.txt'), function (line) {
    if (line.startsWith('AL')){
        name = line.substring(19, 28).trim();
    } else {
        let year = line.substring(0, 4);
        let month = line.substring(4,6);
        let day = line.substring(6,8);
        let time = line.substring(10,14);
        let recordID = line.substring(15,17);
        let status = line.substring(18,21).trim();
        let latitude = line.substring(23,27);
        let longitude = '-' + line.substring(31,35);
        let maxWind = line.substring(39,41);
        let minPressure = line.substring(43,47).trim();
        let data = [name, year, month, day, time, recordID, status, latitude, longitude, maxWind, minPressure];
        table.push(data);
    }
});

/*const table2 = ['name', 'year'];
lineReader.eachLine(path.join(__dirname,'hurdat2-1851-2018-051019.txt'), function (line) {
    if (line.startsWith('AL')){
        name = line.substring(19, 28).trim();
    }
    else {
        let year = line.substring(0,4);
    }
    let data = [name, year];
    table2.push(data);
});*/

const hurricaneTracker = {};

hurricaneTracker.serviceName = 'HurricaneInfo';

/**
 * returns a table displaying all of the recorded hurricanes and their respective information
 * @returns {Array} table - displays hurricane information since 1851
 */

hurricaneTracker.getFullTable = function(){
    return table;
};

/**
 *
 * @param {string} name - name of the hurricane
 * @param {string} year - year that the hurricane occurred in
 * @returns {array} table - table with the information for all hurricanes matching the inputted name
 */

hurricaneTracker.getHurricane = function(name, year){
    let parsedTable = [table[0]];
    for (let i = 1; i < table.length; i++) {
        if (table[i][0] === name.toUpperCase() && table[i][1] === year.toString()){
            parsedTable.push(table[i]);
        }
    }
    if (parsedTable.length === 1) {
        return 'Invalid Hurricane Name or Year';
    }
    else {
        return parsedTable;
    }
};

/**
 *
 * @param {string} year - year to display in the table
 * @returns {array} table - table with the information for all hurricanes within the entered year
 */

hurricaneTracker.getNamesForYear = function(year){

/*
    return table2;
*/
    let parsedTable = Array();
    for (let i = 1; i < table.length; i++) {
        if (table[i][1] === year.toString()) {
            if (!parsedTable.includes(table[i][0]))
                parsedTable.push(table[i][0]);
        }
    }
    if (parsedTable.length === 1) {
        return 'Invalid Year';
    }
    else {
        return parsedTable;
    }
};

/**
 *
 * @param {string} name - name of the hurricane to get the latitude of
 * @param {string} year - year that the hurricane occurred in
 * @returns {Array} table - list of all of the latitudes of the hurricane matching the entered parameters
 */

hurricaneTracker.getLatitude = function(name, year){
    let latitudes = [];
    for (let i = 1; i < table.length; i++) {
        if (table[i][0] === name.toUpperCase() && table[i][1] === year.toString()) {
            let row = table[i];
            latitudes.push(row[7]);
        }
    }
    if (latitudes.length === 0) {
        return 'Invalid name or year';
    }
    else {
        return latitudes;
    }
};

/**
 *
 * @param {string} name - name of the hurricane to get the longitude of
 * @param {string} year - year that the hurricane occurred in
 * @returns {Array} table - list of all of the longitudes of the hurricane matching the entered parameters
 */

hurricaneTracker.getLongitude = function(name, year){
    let longitudes = [];
    for (let i = 1; i < table.length; i++) {
        if (table[i][0] === name.toUpperCase() && table[i][1] === year.toString()) {
            let row = table[i];
            longitudes.push(row[8]);
        }
    }
    if (longitudes.length === 0) {
        return 'Invalid name or year';
    }
    else {
        return longitudes;
    }
};

module.exports = hurricaneTracker;


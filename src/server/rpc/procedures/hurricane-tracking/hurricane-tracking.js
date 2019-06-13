const lineReader = require('line-reader');
const path = require('path');

const table = [
    ['name', 'year', 'month', 'day', 'time', 'recordID', 'status', 'latitude', 'longitude', 'maxWind', 'minPressure']
];

let name = '';

lineReader.eachLine(path.join(__dirname,'hurdat2-1851-2018-051019.txt'), function (line, last) {
    if (line.startsWith('AL')){
        name = line.substring(19, 28).trim();
    } else {
        let year = line.substring(0, 4);
        let month = line.substring(4,6);
        let day = line.substring(6,8);
        let time = line.substring(10,14);
        let recordID = line.substring(15,17);
        let status = line.substring(18,21);
        let latitude = line.substring(23,27);
        let longitude = '-' + line.substring(31,35);
        let maxWind = line.substring(39,41);
        let minPressure = line.substring(43,47).trim();
        let data = [name, year, month, day, time, recordID, status, latitude, longitude, maxWind, minPressure];
        table.push(data);
    }
     if (last){
         console.log(table);
     }
});

const hurricaneTracker = {};

hurricaneTracker.serviceName = 'HurricaneInfo';

hurricaneTracker.parseTable = function(){
    return table;
};

hurricaneTracker.getHurricane = function(text){
    let parsedTable = [table[0]];
    for (let i = 1; i < table.length; i++) {
        if (table[i].includes(text.toUpperCase())) {
            parsedTable.push(table[i]);
        }
    }
    if (parsedTable.length === 1) {
        return 'Invalid Hurricane Name';
    }
    else {
        return parsedTable;
    }
};

hurricaneTracker.getYearList = function(date){
    let parsedTable = [table[0]];
    for (let i = 1; i < table.length; i++) {
        if (table[i].includes(date)) {
            parsedTable.push(table[i]);
        }
    }
    if (parsedTable.length === 1) {
        return 'Invalid Year';
    }
    else {
        return parsedTable;
    }
};

hurricaneTracker.getLatitude = function(name){
    for (let i = 1; i < table.length; i++) {
        if (table[i].includes(name)) {
            let row = table[i];
            return row[7];
        }
    }
    return 'Invalid name';
};

hurricaneTracker.getLongitude = function(name){
    for (let i = 1; i < table.length; i++) {
        if (table[i].includes(name)) {
            let row = table[i];
            return row[8];
        }
    }
    return 'Invalid name';
};
/*hurricaneTracker.parseTable2 = function(){
    const table2 = [
        ['year', 'month', 'day', 'time', 'recordID', 'status', 'latitude', 'longitude', 'maxWind', 'minPressure']
    ];
    for (let i = table.length / 6; i < 2 * table.length / 5; i++) {
        table2.push(table[i]);
    }
    return table2;
};

hurricaneTracker.parseTable3 = function(){
    const table3 = [
        ['year', 'month', 'day', 'time', 'recordID', 'status', 'latitude', 'longitude', 'maxWind', 'minPressure']
    ];
    for (let i = 2 * table.length / 6; i < 3 * table.length / 5; i++) {
        table3.push(table[i]);
    }
    return table3;
};

hurricaneTracker.parseTable4 = function(){
    const table4 = [
        ['year', 'month', 'day', 'time', 'recordID', 'status', 'latitude', 'longitude', 'maxWind', 'minPressure']
    ];
    for (let i = 3 * table.length / 6; i < 4 * table.length / 5; i++) {
        table4.push(table[i]);
    }
    return table4;
};

hurricaneTracker.parseTable5 = function(){
    const table5 = [
        ['year', 'month', 'day', 'time', 'recordID', 'status', 'latitude', 'longitude', 'maxWind', 'minPressure']
    ];
    for (let i = 4 * table.length / 6; i < table.length; i++) {
        table5.push(table[i]);
    }
    return table5;
};

hurricaneTracker.parseTable6 = function(){
    const table6 = [
        ['year', 'month', 'day', 'time', 'recordID', 'status', 'latitude', 'longitude', 'maxWind', 'minPressure']
    ];
    for (let i = 4 * table.length / 6; i < table.length; i++) {
        table6.push(table[i]);
    }
    return table6;
};*/





// hurricaneTracker.parseTable();

module.exports = hurricaneTracker;


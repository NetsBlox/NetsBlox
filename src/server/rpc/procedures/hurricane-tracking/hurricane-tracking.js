const lineReader = require('line-reader');
const path = require('path');

const table = [
    ['Basin', 'Cyclone#', 'Year', 'Name', 'Rows']
];

const hurricaneTracker = {};

hurricaneTracker.serviceName = 'HurricaneInfo';

hurricaneTracker.parseTable = function(){
    lineReader.eachLine(path.join(__dirname,'hurdat2-1851-2018-051019.txt'), function (line, last) {
        if (line.startsWith('AL')){
            //pass
        } else {
            let year = line.substring(0, 4);
            let month = line.substring(4,6);
            let day = line.substring(6,8);
            let time = line.substring(10,14);
            let recordID = line.substring(15,17);
            let status = line.substring(18,21);
            let latitude = line.substring(23,28);
            let longitude = line.substring(31,36);
            let maxWind = line.substring(39,41);
            let minPressure = line.substring(43,47).trim();
            let data = [year, month, day, time, recordID, status, latitude, longitude, maxWind, minPressure];
            table.push(data);
        }

        if (last){
            console.log(table);
        }


    });
};
hurricaneTracker.parseTable();

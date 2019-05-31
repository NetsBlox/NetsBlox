const lineReader = require('line-reader');
const path = require('path');

const table = [
    ['Year', 'Month', 'Interpolated ppm', 'Seasonally adjusted ppm']
];

lineReader.eachLine(path.join(__dirname,'co2_mm_mlo.txt'), function (line, last) {
    if (line.startsWith("#")) {
        //pass
    } else {

        let year = line.substring(0, 4);
        let month = line.substring(4, 8).trim();
        let inter = line.substring(38, 44);
        let season = line.substring(50, 56);
        let localArr = [year, month, inter, season];
        table.push(localArr);
    }
});


const co2service = {};

co2service.serviceName = "CO2Data";

co2service.getTable = function(){
    return table;
};


module.exports = co2service;
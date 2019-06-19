const lineReader = require('line-reader');
const path = require('path');

const table = [
    ['timeDelta', 'oxygenIsotopeRatio', 'deepOceanTemp', 'surfaceTemp', 'seaLevel']
];

lineReader.eachLine(path.join(__dirname,'Table.txt'), function (line) {
    let timeDelta = 2000 - line.substring(0, 7) * 1000000;
    let oxygenIsotopeRatio = line.substring(8, 14);
    let deepOceanTemp = line.substring(16, 22);
    let surfaceTemp = line.substring(24, 30);
    let seaLevel = line.substring(32, 38).trim();
    let data = [timeDelta, oxygenIsotopeRatio, deepOceanTemp, surfaceTemp, seaLevel];
    table.push(data);
});

const table2 = [
    ['timeDelta', 'oxygenIsotopeRatio']
];

lineReader.eachLine(path.join(__dirname,'Table.txt'), function (line) {
    let timeDelta = 2000 - line.substring(0, 7) * 1000000;
    let oxygenIsotopeRatio = line.substring(8, 14);
    let data = [timeDelta, oxygenIsotopeRatio];
    table2.push(data);
});

const table3 = [
    ['timeDelta', 'deepOceanTemp']
];

lineReader.eachLine(path.join(__dirname,'Table.txt'), function (line) {
    let timeDelta = 2000 - line.substring(0, 7) * 1000000;
    let deepOceanTemp = line.substring(16, 22);
    let data = [timeDelta, deepOceanTemp];
    table3.push(data);
});

const table4 = [
    ['timeDelta', 'surfaceTemp']
];

lineReader.eachLine(path.join(__dirname,'Table.txt'), function (line) {
    let timeDelta = 2000 - line.substring(0, 7) * 1000000;
    let surfaceTemp = line.substring(24, 30);
    let data = [timeDelta, surfaceTemp];
    table4.push(data);
});

const table5 = [
    ['timeDelta', 'seaLevel']
];

lineReader.eachLine(path.join(__dirname,'Table.txt'), function (line) {
    let timeDelta = 2000 - line.substring(0, 7) * 1000000;
    let seaLevel = line.substring(32, 38).trim();
    let data = [timeDelta, seaLevel];
    table5.push(data);
});

const quaternaryOceanData = {};

quaternaryOceanData.serviceName = 'OceanData';

/**
 * displays a table containing the year, oxygen isotope ratio, deep ocean temperature, surface temperature, and sea level
 * @returns {Array} table - table showing the year, oxygen isotope ratio, deep ocean temperature, surface temperature, and sea level
 */

quaternaryOceanData.getFullTable = function() {
    return table;
};

/**
 * displays a table showing the year and its corresponding oxygen isotope ratio
 * @returns {array} table - table displaying each year and its corresponding oxygen isotope ratio
 */

quaternaryOceanData.getOxygenRatio = function(){
    return table2;
};

/**
 * displays a table showing the year and its corresponding deep ocean temperature
 * @returns {array} table - table displaying each year and its corresponding oxygen isotope ratio
 */

quaternaryOceanData.getDeepOceanTemp = function(){
    return table3;
};

/**
 * displays a table showing the year and its corresponding surface temperature
 * @returns {array} table - table displaying each year and its corresponding surface temperature
 */

quaternaryOceanData.getSurfaceTemp = function(){
    return table4;
};

/**
 * displays a table showing the year and its corresponding sea level
 * @returns {array} table - table displaying each year and its corresponding sea level
 */

quaternaryOceanData.getSeaLevel = function(){
    return table5;
};

module.exports = quaternaryOceanData;
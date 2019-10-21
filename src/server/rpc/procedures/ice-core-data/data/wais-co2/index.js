const fs = require('fs');
const path = require('path');

// Add deuterium and temperature data
const dataFile = path.join(__dirname, 'antarctica2015co2wais.txt');
const lines = fs.readFileSync(dataFile, 'utf8').split('\n');
const dataRegex = /^[\d.]+\s+-?[\d.]+/;

const records = lines
    .filter(line => dataRegex.test(line))  // Remove all non-data lines
    .map(line => {
        const [/*depth*/, yearsBefore1950, value] = line.split('\t');
        const core = 'WAIS';
        const year = 1950 - yearsBefore1950;
        return {core, year, datatype: 'Carbon Dioxide', value};
    });

module.exports = records;

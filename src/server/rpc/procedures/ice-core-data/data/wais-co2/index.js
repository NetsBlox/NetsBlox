const fs = require('fs');
const path = require('path');
const assert = require('assert');

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

const EXPECTED_RECORD_COUNT = 432;
assert.equal(records.length, EXPECTED_RECORD_COUNT);
module.exports = records;

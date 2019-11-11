const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Add deuterium and temperature data
const deuteriumFile = path.join(__dirname, 'edc3deuttemp2007.txt');
const lines = fs.readFileSync(deuteriumFile, 'utf8').split('\n');
// Remove all the headers and descriptions
const dataRegex = /^\s*\d+\s+[\d.]+\s+-?[\d.]+\s+-?[\d.]+\s+-?[.\d]+$/;
while (!dataRegex.test(lines[0])) {
    lines.shift();
}
while (!dataRegex.test(lines[lines.length-1])) {
    lines.pop();
}

const records = lines
    .map(line => line.trim())
    .map(line => {
        const [/*bag*/, /*depth*/, yearsBefore1950, deuterium, deltaTemp] = line.split(/\s+/);
        const year = 1950 - parseFloat(yearsBefore1950);
        const core = 'Dome C';
        return [
            {core, year, datatype: 'Deuterium', value: deuterium},
            {core, year, datatype: 'Temperature', value: deltaTemp}
        ];
    })
    .reduce((l1, l2) => l1.concat(l2));

const EXPECTED_RECORD_COUNT = 5788 * 2;
assert.equal(EXPECTED_RECORD_COUNT, records.length);
module.exports = records;

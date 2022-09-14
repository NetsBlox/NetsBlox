const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Add deuterium and temperature data
const deuteriumFile = path.join(__dirname, 'deutnat.txt');
const lines = fs.readFileSync(deuteriumFile, 'utf8').split('\n');
// Remove all the headers and descriptions
const dataRegex = /^\d+\s\d+\s-\d+\.?\d?\s-?\d\.\d\d$/;
while (!dataRegex.test(lines[0])) {
    lines.shift();
}
while (!dataRegex.test(lines[lines.length-1])) {
    lines.pop();
}

const records = lines
    .map(line => {
        const [/*depth*/, yearsBefore1950, deuterium, deltaTemp] = line.split('\t');
        const year = 1950 - yearsBefore1950;
        const core = 'Vostok';
        return [
            {core, year, datatype: 'Deuterium', value: deuterium},
            {core, year, datatype: 'Temperature', value: deltaTemp}
        ];
    })
    .reduce((l1, l2) => l1.concat(l2));

const EXPECTED_RECORD_COUNT = 3311 * 2;
assert.equal(records.length, EXPECTED_RECORD_COUNT);
module.exports = records;

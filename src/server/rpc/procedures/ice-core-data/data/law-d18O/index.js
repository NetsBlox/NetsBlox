const fs = require('fs');
const path = require('path');
const assert = require('assert');

const dataFile = path.join(__dirname, 'law2012d18o.txt');
const lines = fs.readFileSync(dataFile, 'utf8').split('\n');

// Remove all the headers and descriptions
const dataRegex = /^\d+\s+-?[\d.]+/;
while (!dataRegex.test(lines[0])) {
    lines.shift();
}
while (!dataRegex.test(lines[lines.length-1])) {
    lines.pop();
}

const records = lines
    .map(line => {
        const [year, value] = line.split('\t');
        const core = 'Law';
        return {core, year, datatype: 'Delta18O', value};
    });

const EXPECTED_RECORD_COUNT = 1823;
assert.equal(records.length, EXPECTED_RECORD_COUNT);
module.exports = records;

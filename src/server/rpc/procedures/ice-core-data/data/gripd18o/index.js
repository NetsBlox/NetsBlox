const fs = require('fs');
const path = require('path');
const assert = require('assert');

const dataFile = path.join(__dirname, 'gripd18o.txt');
const lines = fs.readFileSync(dataFile, 'utf8').split('\n');

// Remove all the headers and descriptions
const dataRegex = /^[\d.]+\s+-?[\d.]+\s+-?[\d.]+/;
while (!dataRegex.test(lines[0])) {
    lines.shift();
}
while (!dataRegex.test(lines[lines.length-1])) {
    lines.pop();
}

const records = lines
    .map(line => {
        const [/*depth*/, value, yearBP] = line.split('\t');
        const core = 'GRIP';
        return {
            core: core,
            year: 1950 - yearBP,
            datatype: 'Delta18O',
            value: value
        };
    });

const EXPECTED_COUNT = 5425;
assert.equal(records.length, EXPECTED_COUNT);

module.exports = records;

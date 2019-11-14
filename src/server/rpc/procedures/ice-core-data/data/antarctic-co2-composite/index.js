const fs = require('fs');
const path = require('path');
const assert = require('assert');

function getCoreName(yearBP) {
    assert(
        yearBP > -52 && yearBP < 805669,
        `Year ${yearBP} outside expected range.`
    );

    if (yearBP < 2000) {
        return 'Law';
    } else if (yearBP < 11000) {
        return 'Dome C';
    } else if (yearBP < 22000) {
        return 'WAIS';
    } else if (yearBP < 40000) {
        return 'Siple Dome';
    } else if (yearBP < 60000) {
        return 'TALDICE';
    } else if (yearBP < 115000) {
        return 'EDML';
    } else if (yearBP < 155000) {
        return 'Dome C';
    } else if (yearBP < 393000) {
        return 'Vostok';
    } else {
        return 'Dome C';
    }
}

const dataFile = path.join(__dirname, 'antarctica2015co2composite.txt');
const lines = fs.readFileSync(dataFile, 'utf8').split('\n');

// Remove all the headers and descriptions
const dataRegex = /^-?[\d.]+\s+[\d.]+\s+[\d.]+/;
while (!dataRegex.test(lines[0])) {
    lines.shift();
}
while (!dataRegex.test(lines[lines.length-1])) {
    lines.pop();
}

const records = lines
    .map(line => {
        const [yearsBefore1950, value] = line.split('\t');
        const core = getCoreName(parseFloat(yearsBefore1950));
        const year = 1950 - yearsBefore1950;
        return {core, year, datatype: 'Carbon Dioxide', value};
    });

const EXPECTED_RECORD_COUNT = 1901;
assert.equal(records.length, EXPECTED_RECORD_COUNT);

const CORE_NAMES = ['Law', 'Dome C', 'WAIS', 'Vostok'];
module.exports = records.filter(record => CORE_NAMES.includes(record.core));

const fs = require('fs');
const path = require('path');
const assert = require('assert');

// Get the Gas Age/GT4 data
function fetchData(filename, dataRegex) {
    const dataFile = path.join(__dirname, filename);
    const lines = fs.readFileSync(dataFile, 'utf8').split('\n');

    // Remove all the headers and descriptions
    while (!dataRegex.test(lines[0])) {
        lines.shift();
    }
    while (!dataRegex.test(lines[lines.length-1])) {
        lines.pop();
    }

    return lines;
}

const dates = fetchData('gt4nat.txt', /^\d+\t\d+\t\d+$/)
    .map(line => {
        const [/*depth*/, yearsBefore1950, gasAge] = line.split('\t');
        return [parseFloat(gasAge), parseFloat(yearsBefore1950)];
    });

function getGT4DateFromGasAge(gasAge) {
    let index = dates.length - 1;

    while (dates[index][0] > gasAge) {
        index--;
    }

    const [earlierGasAge, earlierGT4] = dates[index];
    const [laterGasAge, laterGT4] = dates[index + 1];

    const ratio = (gasAge - earlierGasAge)/(laterGasAge - earlierGasAge);
    return earlierGT4 + ratio * (laterGT4 - earlierGT4);
}

const records = fetchData('co2nat.txt', /^\d+\s[\d.]+$/)
    .map(line => {
        const [gasAge, value] = line.split('\t');
        const yearsBefore1950 = getGT4DateFromGasAge(parseFloat(gasAge));
        const year = 1950 - yearsBefore1950;
        const core = 'Vostok';
        return {core, year, datatype: 'Carbon Dioxide', value};
    });

const EXPECTED_RECORD_COUNT = 283;
assert.equal(records.length, EXPECTED_RECORD_COUNT);

module.exports = records;

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const dataRegex = /^\s*-?[.\d]+\s+-?[.\d]+\s+-?\d+/;
const records = fs.readFileSync(path.join(__dirname, 'Table.txt'), 'utf8')
    .split('\n')
    .map(function (line, index) {
        if (!dataRegex.test(line)) {
            return;
        }

        const [yearBP, oxygenIsotopeRatio, deepOceanTemp, surfaceTemp, seaLevel] = line.trim().split(/\s+/).slice(2).map(data => parseFloat(data));

        let year = 1950 - yearBP * 1000000;
        assert(year < 1950, `Converting ${yearBP} to ${year} (line: ${index + 1})`);
        assert(!isNaN(seaLevel), `Invalid sea level on line ${index}: "${line}"`);
        return {year, oxygenIsotopeRatio, deepOceanTemp, surfaceTemp, seaLevel};
    })
    .filter(doc => !!doc);

const EXPECTED_COUNT = 17604;
assert.equal(EXPECTED_COUNT, records.length);

module.exports = records;

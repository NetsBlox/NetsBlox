const fs = require('fs');
const path = require('path');
const assert = require('assert');

const dataFiles = [
    ['Quelccaya Summit Dome', 'qsd.csv', 1784],
    ['Quelccaya North Dome', 'qnd.csv', 100],
    ['Huascaran Dome', 'huascaran.csv', 179],
];

const records = dataFiles.flatMap(datasetInfo => {
    const [core, filename, recordCount] = datasetInfo;
    const lines = fs.readFileSync(path.join(__dirname, filename), 'utf8').trim().split('\n');
    /*const header = */lines.shift();
    const records = lines.map(line => {
        let [year, value] = line.split(',');
        year = +year;
        value = parseFloat(value);
        assert(!isNaN(year), `Found NaN year: ${line}`);
        assert(!isNaN(value), `Found NaN value: ${line}`);
        return {core, year, datatype: 'Deuterium', value};
    });
    assert(
        records.length === recordCount,
        `Expected ${recordCount} records in ${filename} but found ${records.length}`
    );
    return records;
});
module.exports = records;

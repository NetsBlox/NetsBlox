const fs = require('fs');
const path = require('path');

// Load all the data directories
module.exports = fs.readdirSync(__dirname)
    .filter(name => fs.lstatSync(path.join(__dirname, name)).isDirectory())
    .map(name => {
        const records = require(`./${name}`);
        if (records.length === 0) {
            throw new Error(`Did not receive any records from ${name}`);
        }
        return records;
    })
    .reduce((l1, l2) => l1.concat(l2));

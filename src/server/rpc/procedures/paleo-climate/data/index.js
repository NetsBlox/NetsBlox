const fs = require('fs');

// Load all the data directories
module.exports = fs.readdirSync(__dirname)
    .filter(name => name !== 'index.js')
    .map(name => {
        const records = require(`./${name}`);
        if (records.length === 0) {
            throw new Error(`Did not receive any records from ${name}`);
        }
        return records;
    })
    .reduce((l1, l2) => l1.concat(l2));

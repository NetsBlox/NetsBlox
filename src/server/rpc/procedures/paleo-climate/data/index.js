const fs = require('fs');

// Load all the data directories
module.exports = fs.readdirSync(__dirname)
    .filter(name => name !== 'index.js')
    .map(name => require(`./${name}`))
    .reduce((l1, l2) => l1.concat(l2));

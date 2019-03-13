const getServiceStorage = require('../../advancedStorage');
const fs = require('fs');

const schemaDef = {};
const headers = fs.readFileSync(__dirname + '/metobjects.headers', {encoding: 'utf8'})
    .trim()
    .split(',');
headers.forEach(attr => {
    schemaDef[attr] = String;
});

schemaDef['Primary Image'] = String;
schemaDef['Additional Images'] = [String];

module.exports = getServiceStorage('MetMuseum', schemaDef);

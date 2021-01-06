const fs = require('fs');
const path = require('path');
const _ = require('lodash');

const templates = fs.readdirSync(__dirname)
    .filter(name => name.endsWith('.tpl'))
    .map(name => {
        const filepath = path.join(__dirname, name);
        const contents = fs.readFileSync(filepath, 'utf8');
        return [name.replace('.tpl', ''), _.template(contents)];
    });

const Blocks = _.fromPairs(templates);
module.exports = Blocks;

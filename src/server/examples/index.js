// This file will prepare the raw source code from the examples directory
const fs = require('fs');
const path = require('path');
const extractRpcs = require('../server-utils').extractRpcs;
const nbVersion = require('../../../package.json').version;
const _ = require('lodash');

// Create the dictionary of examples
var examples = {};

const Q = require('q');
const Example = {};
Example.getRole = function(role) {
    return Q(this._roles[role]);
};

Example.getRoleNames = function() {
    return Q(Object.keys(this._roles));
};

Example.toString = function() {
    let roles = Object.keys(this._roles).map(name => this._roles[name]);
    const projectName = roles[0].RoomName;

    let res = `<room name="${projectName}" app="NetsBlox ${nbVersion}, http://netsblox.org">`;
    for (const role of roles) {
        res += `<role name="${role.ProjectName}">${role.SourceCode}${role.Media}</role>`;
    }
    res += '</room>';

    return res;
};

fs.readdirSync(__dirname)
    .map(dir => path.join(__dirname, dir))
    .filter(name => fs.lstatSync(name).isDirectory())
    .map(dir => [path.basename(dir), fs.readdirSync(dir).filter(name => path.extname(name) === '.xml')])
    .map(pair => {
        const [dirname, clients] = pair;
        const result = Object.create(Example);

        result.RoomName = dirname;
        result._roles = {};
        result._projMedia = null;
        for (const client of clients) {
            const name = client.replace('.xml', '');
            const content = fs.readFileSync(path.join(__dirname, dirname, client), 'utf8');
            result._roles[name] = content;
        }
        return result;
    })
    .forEach(item => {
        item.roles = {};
        item.services = [];
        for (const rolename in item._roles) {
            item.roles[rolename] = null;
            // TODO: FIXME: the roles are not the correct format
            const src = item._roles[rolename];
            item.services = item.services.concat(extractRpcs(src));
            item._roles[rolename] = {
                SourceCode: src,
                ProjectName: rolename,
                RoomName: item.RoomName,
                Media: '<media></media>'
            };

        }
        item.services = _.uniq(item.services);

        examples[item.RoomName] = item;
    });

module.exports = Object.freeze(examples);

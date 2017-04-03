// This file will prepare the raw source code from the examples directory
var fs = require('fs'),
    path = require('path'),
    extractRpcs = require('../server-utils').extractRpcs,
    _ = require('lodash');

// Create the dictionary of examples
var examples = {};

// Read in the directories
fs.readdirSync(__dirname)
    .map(dir => path.join(__dirname, dir))
    .filter(name => fs.lstatSync(name).isDirectory())
    // create pairs -> [dirname, [xml, files]]
    .map(dir => [path.basename(dir), fs.readdirSync(dir)
        .filter(name => path.extname(name) === '.xml')]
    )
    // create the example data objects
    .map(pair => {
        var result = {},
            clients = pair[1];

        result.RoomName = pair[0];
        result.cachedProjects = {};

        // Add project source
        for (var i = clients.length; i--;) {
            result.cachedProjects[clients[i].replace('.xml', '')] =
                fs.readFileSync(path.join(__dirname, pair[0], clients[i]), 'utf8');
        }
        return result;
    })
    .forEach(item => {
        var roles = Object.keys(item.cachedProjects),
            src;

        item.roles = {};
        item.services = [];
        for (var i = roles.length; i--;) {
            item.roles[roles[i]] = null;
            // TODO: FIXME: the cachedProjects are not the correct format
            src = item.cachedProjects[roles[i]];
            item.services = item.services.concat(extractRpcs(src));
            item.cachedProjects[roles[i]] = {
                SourceCode: src,
                ProjectName: roles[i],
                RoomName: item.RoomName,
                Media: '<media></media>'
            };

        }
        item.services = _.uniq(item.services); // keep only the unique services.

        // Add to examples dictionary
        examples[item.RoomName] = item;
    });

module.exports = Object.freeze(examples);

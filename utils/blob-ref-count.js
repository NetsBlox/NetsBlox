/* eslint-disable no-console*/
// Print all the hashes referenced from the database
require('epipebomb')();  // Allow piping to 'head'

var Command = require('commander').Command,
    Storage = require('../src/server/storage/storage'),
    Logger = require('../src/server/logger'),
    Projects = require('../src/server/storage/projects'),
    Actions = require('../src/server/storage/user-actions'),
    logger = new Logger('netsblox:util:ref-count'),
    storage = new Storage(logger),
    program = new Command();

program
    .option('-d,--dir', 'print the paths rather than hashes')
    .option('-c,--count', 'count the number of occurrences of the hash')
    .parse(process.argv);

let counts = {};
const count = function(hash) {
    counts[hash] = counts[hash] || 0;
    counts[hash]++;
};

const isHash = val => typeof val === 'string' && val.length === 128;

storage.connect()
    .then(() => {
        // Check the project hashes
        let collection = Projects.getCollection();
        return collection.find({}).forEach(doc => {
            if (!doc.roles) {
                console.error(doc.owner + '/' + doc.name, ' corrupted roles:', doc.roles);
                return;
            }

            var roles = Object.keys(doc.roles).map(r => doc.roles[r]).filter(role => !!role);
            var hashes = roles.map(role => role.SourceCode).concat(roles.map(role => role.Media));
            hashes.forEach(hash => count(hash));
        }, () => {
            // Check the recorded actions...
            const query = {
                'action.type': 'openProject',
                'action.args': {$gt: []}
            };
            return Actions.getCollection().find(query).forEach(doc => {
                if (doc.action.args && doc.action.args.length && isHash(doc.action.args[0])) {
                    count(doc.action.args[0]);
                }
            }, () => {
                // print the counts
                var hashes = Object.keys(counts);
                hashes.forEach(hash => {
                    var count = counts[hash];
                    if (program.dir) hash = hash.substring(0, 2) + '/' + hash.substring(2);

                    if (program.count) {
                        console.log(hash + '\t' + count);
                    } else {
                        console.log(hash);
                    }
                });
                storage.disconnect();
            });
        });
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });

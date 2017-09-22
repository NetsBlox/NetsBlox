// Count references of everything in the blob
require('epipebomb')();  // Allow piping to 'head'

var Command = require('commander').Command,
    Storage = require('../src/server/storage/storage'),
    Logger = require('../src/server/logger'),
    rp = require('request-promise'),
    Projects = require('../src/server/storage/projects'),
    logger = new Logger('netsblox:cli:persist'),
    storage = new Storage(logger),
    program = new Command();

const fs = require('fs');
const Q = require('q');

program
    .parse(process.argv);

storage.connect()
    .then(() => {
        // Check the project hashes
        // TODO
        let collection = Projects.getCollection();
        return collection.find({}).forEach(doc => {
            if (!doc.roles) {
                console.log(doc.roles);
                console.error(doc.owner + '/' + doc.name, ' corrupted roles:', doc.roles);
                return;
            }

            var roles = Object.keys(doc.roles).map(r => doc.roles[r]).filter(role => !!role);
            var hashes = roles.map(role => role.SourceCode).concat(roles.map(role => role.Media));
            hashes.forEach(hash => console.log(hash));
        }, () => storage.disconnect());

        // Check the recorded actions...
        // TODO
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    })

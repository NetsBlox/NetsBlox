/* eslint-disable no-console*/
// verify that the projects are not malformed and blob data exists
require('epipebomb')();  // Allow piping to 'head'

var Command = require('commander').Command,
    Storage = require('../src/server/storage/storage'),
    Logger = require('../src/server/logger'),
    Projects = require('../src/server/storage/projects'),
    blob = require('../src/server/storage/blob-storage'),
    Actions = require('../src/server/storage/user-actions'),
    logger = new Logger('netsblox:util:ref-count'),
    storage = new Storage(logger),
    program = new Command();

program
    .parse(process.argv);

let counts = {};
const count = function(hash) {
    counts[hash] = counts[hash] || 0;
    counts[hash]++;
};

const isHash = val => typeof val === 'string' && val.length === 128;

let missingBlobData = true;
storage.connect()
    .then(() => {
        // Check the project hashes
        let collection = Projects.getCollection();
        return collection.find({}).forEach(doc => {
            if (!doc.roles) {
                console.error(doc.owner + '/' + doc.name, ' corrupted `roles`:', doc.roles);
                return;
            }

            var roles = Object.keys(doc.roles).map(r => doc.roles[r]).filter(role => !!role);

            // Check the blob data exists
            roles.forEach(role => {
                if (!blob.dataExists(role.SourceCode)) {
                    console.log(`${role.ProjectName}@${doc.name}@${doc.owner} has invalid role source: ${role.SourceCode}`);
                    missingBlobData = true;
                }
                if (!blob.dataExists(role.Media)) {
                    console.log(`${doc.name}@${doc.owner} has invalid role media: ${role.ProjectName}`);
                    missingBlobData = true;
                }
            });
        }, () => {
            // Check the recorded actions...
            const query = {
                'action.type': 'openProject',
                'action.args': {$gt: []}
            };
            return Actions.getCollection().find(query).forEach(doc => {
                if (doc.action.args && doc.action.args.length && isHash(doc.action.args[0])) {
                    console.log(`replay action missing blob data: ${doc.action.args[0]}`);
                    missingBlobData = true;
                    count(doc.action.args[0]);
                }
            }, () => {
                // print the counts
                storage.disconnect();
                if (!missingBlobData) console.log('no errors!');
                process.exit(missingBlobData ? 1 : 0);
            });
        });
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });

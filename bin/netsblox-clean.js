/* eslint-disable no-console*/
require('epipebomb')();  // Allow piping to 'head'

var Command = require('commander').Command,
    storage = require('../src/server/storage/storage'),
    rp = require('request-promise'),
    Projects = require('../src/server/storage/projects'),
    program = new Command();

const fs = require('fs');
const Q = require('q');

program
    .parse(process.argv);

// Go through the database and get all the transient projects that don't have corresponding rooms
//   - Get the currently open rooms
//   - Get all ids of transient projects that are not open
const stateEndpoint = process.env.STATE_ENDPOINT || 'state';
let url = `http://localhost:${process.env.PORT}/${stateEndpoint}/rooms`;
const outputPath = `removed-projects-${new Date()}.jsonl`;
const ids = [];
let collection = null;
let writeStream = null;
storage.connect()
    .then(() => rp(url))
    .then(data => {
        collection = Projects.getCollection();
        const roomNamesByOwner = {};
        const rooms = JSON.parse(data);
        rooms.forEach(room => {
            roomNamesByOwner[room.owner] = roomNamesByOwner[room.owner] || [];
            roomNamesByOwner[room.owner].push(room.name);
        });

        writeStream = fs.createWriteStream(outputPath, {flags: 'w'});
        const deferred = Q.defer();

        collection.find({transient: true}).forEach(doc => {
            var names = roomNamesByOwner[doc.owner] || [];
            if (!names.includes(doc.name)) {
                console.log(`marked transient project for removal: ${doc.owner}/${doc.name}`);
                writeStream.write(JSON.stringify(doc, null, 2) + '\n');
                ids.push(doc._id);
            } else {
                console.log(`skipping open transient project: ${doc.owner}/${doc.name}`);
            }
        }, deferred.resolve);

        return deferred.promise;
    })
    .then(() => {
        writeStream.end();
        if (ids.length) {
            console.log('about to remove', ids.length, 'transient projects');
            return collection.deleteMany({$or: ids.map(id => {
                return {_id: id};
            })});
        } else {
            console.log('no projects to remove');
        }
    })
    .then(() => {
        if (ids.length) {
            console.log(`removed ${ids.length} transient projects`);
        }
        return storage.disconnect();
    })
    .catch(err => {
        console.error(err);
        return storage.disconnect();
    });
/* eslint-enable no-console*/

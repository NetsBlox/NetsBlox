/* eslint-disable no-console */
// migration for converting projects to be stored in the blob...

// Backup the database first!
const MongoClient = require('mongodb').MongoClient;
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const Q = require('q');
const blob = require('../src/server/storage/blob-storage');

console.log(`connecting to ${mongoURI}`);
MongoClient.connect(mongoURI)
    .then(db => {
        const collection = db.collection('users');
        const cursor = collection.find({}).stream(),
            transforms = [];

        cursor.on('data', user => {
            console.log('user:', user.username);
            if (process.argv[2] === '--force') {
                transforms.push(
                    transformUser(user)
                        .then(user => collection.save(user, {upsert: true}))
                );
            }
        });

        cursor.once('end', () => {
            if (process.argv[2] !== '--force')
                console.error('Did you back up the database? If so, call with "--force"');

            Q.all(transforms).then(() => db.close(true))
                .fail(err => console.error('Err:', err));

        });

        cursor.on('error', err => console.error('ERROR!', err));
    });

// For each user, move it's SourceCode and media entries to the blob
function transformUser(user) {
    return Q.all(user.rooms.map(transformRoom))
        .then(projects => {
            user.projects = projects;
            delete user.rooms;
        })
        //.then(() => console.log(JSON.stringify(user, null, 2)))
        .then(() => user);
}

function transformRoom(room) {
    var roles = Object.keys(room.roles).map(name => room.roles[name]);

    return Q.all(roles.map(transformRole))
        .then(roles => {
            roles.forEach(role => room.roles[role.ProjectName] = role);
            return room;
        });
}

function transformRole(role) {
    return blob.store(role.SourceCode)
        .then(id => {
            role.SourceCode = id;
            return blob.store(role.Media);
        })
        .then(id => {
            role.Media = id;
            return role;
        });
}

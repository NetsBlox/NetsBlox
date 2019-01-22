/* eslint-disable no-console */
// migration for converting nested projects to their own collection

// Backup the database first!
const MongoClient = require('mongodb').MongoClient;
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const Q = require('q');

console.log(`connecting to ${mongoURI}`);
MongoClient.connect(mongoURI)
    .then(db => {
        const collection = db.collection('users');
        const projectCollection = db.collection('projects');
        const cursor = collection.find({}).stream(),
            transforms = [];

        cursor.on('data', user => {
            console.log('user:', user.username);
            if (process.argv[2] === '--force') {
                transforms.push(
                    transformUser(user, projectCollection)
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

function transformUser(user, projectStore) {
    return Q.all(user.projects.map(transformProject))
        .then(projects => {
            delete user.projects;
            return Q.all(projects.map(project => projectStore.save(project)));
        })
        .then(() => user);
}

function transformProject(project) {
    const roleIds = Object.keys(project.roles);
    const roles = project.roles;

    project.roles = {};
    roleIds.forEach(id => {
        if (id.replace(/\./g, '-') !== id) {
            console.log('renaming role', id);
        }
        project.roles[id.replace(/\./g, '-')] = roles[id];
    });

    project.collaborators = [];
    return project;
}

// migration for replicating published projects to a separate collection

const MongoClient = require('mongodb').MongoClient;
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const Q = require('q');
const blob = require('../src/server/storage/blob-storage');
const publicProjects = require('../src/server/storage/public-projects');
const Logger = require('../src/server/logger');

console.log(`connecting to ${mongoURI}`);
MongoClient.connect(mongoURI)
    .then(db => {
        const collection = db.collection('users');
        const cursor = collection.find({}).stream();
        let transforms = [];
        publicProjects.init(new Logger('netsblox:migration:publicize'),db);
        cursor.on('data', user => {
            console.log('user:', user.username);
            transforms = transforms.concat(
                user.projects.filter(prj => prj.Public)
                    .map(prj=> publicProjects.publish(prj))
            );
        });

        cursor.once('end', () => {
            Q.all(transforms).then(() => db.close(true))
                .fail(err => console.error('Err:', err));
        });

        cursor.on('error', err => console.error('ERROR!', err));
    });
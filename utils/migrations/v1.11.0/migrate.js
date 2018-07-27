/* eslint-disable no-console */

// Backup the database first!
const MongoClient = require('mongodb').MongoClient;
const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017';
const Storage = require('../../../src/server/storage/storage');
const Q = require('q');

console.log(`connecting to ${mongoURI}`);
MongoClient.connect(mongoURI)
    .then(async client => {
        const dbName = Storage.getDatabaseFromURI(mongoURI);
        const db = client.db(dbName);
        const collection = db.collection('project-actions');
        const total = await collection.count({});
        let count = 0;
        const cursor = collection.find({}).stream();
        function incrementCount() {
            count++;
        }

        cursor.on('data', async action => {
            console.log(action.action && action.action.username);
            if (process.argv[2] === '--force') {
                const newAction = transform(action);

                if (newAction) {
                    try {
                        await collection.save(newAction, {upsert: true});
                    } catch (e) {
                        console.error(`Could not save ${newAction._id}`, e);
                    } finally {
                        incrementCount();
                    }
                }
            }
        });

        cursor.once('end', () => {
            if (process.argv[2] !== '--force')
                console.error('Did you back up the database? If so, call with "--force"');

            waitUntil(() => count === total)
                .then(() => client.close(true))
                .fail(err => console.error('Err:', err));

        });

        cursor.on('error', err => console.error('ERROR!', err));
    });

function transform(action) {
    if (!action.projectId) {
        console.error(`Found action without projectId: ${action._id}`);
        return;
    }

    action.projectId = action.projectId.toString();
    return action;
}

function waitUntil(fn) {
    const deferred = Q.defer();
    const id = setInterval(() => {
        if (fn()) {
            clearInterval(id);
            deferred.resolve();
        }
    }, 100);

    return deferred.promise;
}

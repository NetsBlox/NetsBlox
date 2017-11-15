// Migrate the projects from the old blob to the new one
const LegacyBlob = require('../../../src/server/storage/blob/legacy');
const Storage = require('../../../src/server/storage/storage');
const Projects = require('../../../src/server/storage/projects');
const UserActions = require('../../../src/server/storage/user-actions');
const Q = require('q');
const Logger = require('../../../src/server/logger');
const logger = new Logger('netsblox:migration:blob');
const storage = new Storage(logger);

// Steps:
//  - Load all the raw projects
//  - manually load the blob content
//  - import the projects back into netsblox
if (process.argv.length < 3) {
    console.log('usage: blob <path-to-legacy-blob>');
    process.exit(1);
}

let Counts = {};
Counts.projects = 0;
Counts.actions = {
    failed: 0,
    in: 0,
    out: 0
};
let FINISHED = false;

LegacyBlob.configure(process.argv[2]);
storage.connect()
    //.then(_db => {  // project migrations
        //let deferred = Q.defer();
        //let collection = Projects.getCollection();
        //let stream = collection.find({}).stream();
        //let ops = [];

        //stream.on('data', project => ops.push(migrateProject(project, collection)));
        //stream.once('end', () => Q.all(ops).then(deferred.resolve));

        //return deferred.promise;
    //})
    .then(() => {  // action migrations
        console.log('project migration complete.');
        let deferred = Q.defer();
        let collection = UserActions.getCollection();
        let stream = collection.find({}).stream();
        let ops = [];

        stream.on('data', action => {
            let result = migrateAction(action, collection)
            if (result) {
                result = result.catch(err => {
                    console.error(`ERROR: ${err}`);
                    console.error(`failing action is ${JSON.stringify(action, null, 2)}`);
                    Counts.actions.failed++;
                    //deferred.reject(err);
                });
                ops.push(result);
            }
            Counts.actions.in++;
        });
        stream.once('end', () => {
            console.log(`found ${Counts.actions.in} actions`);
            return Q.all(ops)
                .then(() => deferred.resolve());
        });

        return deferred.promise;
    })
    .then(() => console.log('migration complete!'))
    .then(() => storage.disconnect())
    .catch(err => storage.disconnect())
    .then(() => FINISHED = true);

///////////////////////// Project Migration /////////////////////////
function migrateProject(project) {
    // TODO
    //console.log(project);
}

///////////////////////// Action Migration /////////////////////////
function migrateAction(data, collection) {
    if (data.value && data.value.length) {
        // convert old action types into the new format
        return splitActionSession(data, collection);
    } else {
        return updateActionBlob(data, collection);
    }
}

function updateActionBlob(event, collection) {
    // openProject actions to
    if (actionUsesBlob(event)) {
        let hashes = event.action.args[0];
        let transform = null;
        if (hashes instanceof Array) {
            transform = Q.all(hashes.map(hash => LegacyBlob.get(hash)))
                .then(data => {
                    let xml = `<snapdata>+${data}</snapdata>`;
                    event.action.args[0] = xml;
                    // TODO:
                    return event
                });
        } else {  // single hash
            let hash = hashes;
            transform = LegacyBlob.get(hash)
                .then(data => event.action.args[0] = data);
        }

        // load the event back into the database
        return transform
            .then(() => event._id && collection.deleteOne({_id: event._id}))
            .then(() => UserActions.record(event))
            .then(() => Counts.actions.out++);
    }
    Counts.actions.out++;
}

function actionUsesBlob(event) {
    if (event.action && event.action.type === 'openProject' && event.action.args.length) {
        let hashes = event.action.args[0];
        let hash = hashes;
        if (hashes instanceof Array) hash = hashes[0];
        return hash && hash[0] !== '<';
    }
    return false;
}

function splitActionSession(data, collection) {
    let id = data._id;
    let actions = data.value;
    return collection.deleteOne({_id: id})
        .then(() => Q.all(actions.map(action => {
            if (actionUsesBlob(action)) return updateActionBlob(action);
            return UserActions.record(action)
                .then(() => Counts.actions.out++);
        })));
}

// Heap dump info
const heapdump = require('heapdump');

function generateHeapDumpAndStats(){
  //2. Output Heap stats
  let heapUsed = process.memoryUsage().heapUsed;
  console.log(`Completed ${Counts.actions.out} actions. ${Counts.actions.in-Counts.actions.out} pending...`);
  console.log(`${Counts.actions.failed} failures...`);
  console.log("Program is using " + heapUsed + " bytes of Heap.")

  //heapdump.writeSnapshot(`./${Date.now()}.heapsnapshot`);
    if (!FINISHED) {
        setTimeout(generateHeapDumpAndStats, 2000); //Do garbage collection and heap dump every 2 seconds
    }
}

//Kick off the program
setTimeout(generateHeapDumpAndStats, 2000); //Do garbage collection and heap dump every 2 seconds

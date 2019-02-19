// This is a script to ensure that the roles have the correct role name set for
// ProjectName
const Command = require('commander').Command;
const program = new Command();

const Storage = require('../src/server/storage/storage');
const Projects = require('../src/server/storage/projects');

const Logger = require('../src/server/logger');
const logger = new Logger('netsblox:util:ensure-role-names');
const storage = new Storage(logger);
const Q = require('q');

program
    .option('-d, --dry-run', 'do not edit any projects')
    .parse(process.argv);

storage.connect()
    .then(() => {
        let collection = Projects.getCollection();
        let operation = Q();
        let Counts = {};
        Counts.badProjects = 0;
        Counts.missingRoles = 0;
        Counts.noRoles = 0;
        Counts.wrongNameRoles = 0;
        return collection.find({}).forEach(doc => {
            let query = {_id: doc._id};
            let humanId = `${doc.owner}/${doc.name}`;
            if (!doc.roles) {  // delete the project
                if (!program.dryRun) {
                    operation = operation.then(() => collection.deleteOne(query));
                }
                Counts.badProjects++;
                return console.log(`${humanId} has no roles field`);
            }

            let names = Object.keys(doc.roles);
            let roleCount = names.length;
            names.forEach(name => {
                let role = doc.roles[name];
                let humanRoleId = `${name} from ${humanId}`;

                if (!role) {
                    if (!program.dryRun) {  // remove the role
                        roleCount--;
                        let update = {$unset: {}};
                        update.$unset[`roles.${name}`] = 1;
                        operation = operation
                            .then(() => collection.update(query, update));
                    }
                    Counts.missingRoles++;
                    return console.log(`${humanRoleId} is not defined`);
                }

                if (role.ProjectName !== name) {
                    Counts.wrongNameRoles++;
                    let msg = `${humanRoleId} has invalid name: ${role.ProjectName}`;
                    console.log(msg);

                    if (!program.dryRun) {  // fix the role name
                        let update = {$set: {}};
                        update.$set[`roles.${name}.ProjectName`] = name;
                        operation = operation
                            .then(() => collection.update(query, update));
                    }
                }
            });

            // If it has no remaining roles, remove!
            if (roleCount === 0) {
                Counts.noRoles++;
                let msg = `${humanId} has no valid roles.`;
                console.log(msg);
                if (!program.dryRun) {
                    operation = operation.then(() => collection.deleteOne(query));
                }
            }

        }, () => {
            let action = program.dryRun ? 'Found' : 'Fixed';
            console.log('\n-------------- summary --------------');
            console.log(`${action} ${Counts.badProjects} malformed projects`);
            console.log(`${action} ${Counts.missingRoles} missing roles`);
            console.log(`${action} ${Counts.noRoles} without any roles`);
            console.log(`${action} ${Counts.wrongNameRoles} incorrectly named roles`);
            return operation.then(() => storage.disconnect());
        });
    })
    .catch(err => {
        console.log(err);
        storage.disconnect();
    });

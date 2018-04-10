// seed the database with the fixtures
const users = require('./users');
const projects = require('./projects');
const Q = require('q');
const hash = require('../../src/common/sha512').hex_sha512;
const ActiveRoom = require('../../src/server/rooms/active-room');
const PublicProjects = require('../../src/server/storage/public-projects');
const Logger = require('../../src/server/logger');
const logger = new Logger('netsblox:test:fixtures');

function seed(storage) {
    // Add the users and the projects from the respective files!
    const createUsers = users.map(data => {  // create the users
        let user = storage.users.new(data.username, data.email);
        user.hash = hash(data.password);
        return user.save();
    });

    return Q.all(createUsers)
        .then(() => Q.all(projects.map(data => {
            // Load the project
            let project = null;
            const room = new ActiveRoom(logger, data.name, data.owner);
            const userData = {
                username: data.owner,
                role: data.activeRole
            };

            // create, set role data, publish!
            return storage.projects.new(userData, room)
                .then(_project => project = _project)
                .then(() => {
                    const promises = data.roles.map(role =>
                        project.setRoleById(role.ProjectName + '-ID', role));
                    return Q.all(promises);
                })
                .then(() => {
                    if (data.Public) {
                        return project.setPublic(true)
                            .then(() => PublicProjects.publish(project));
                    }
                })
                .then(() => {
                    if (!data.transient) {
                        return project.persist();
                    }
                });
        })));
}

module.exports.init = seed;

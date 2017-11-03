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
    return Q.all(users.map(data => {  // create the users
        let user = storage.users.new(data.username, data.email);
        user.hash = hash(data.password);
        return user.save();
    }))
    .then(() => Q.all(projects.map(data => {
        // Load the project
        let project = null;
        const room = new ActiveRoom(logger, data.name, data.owner);
        const userData = {
            username: data.owner,
            roleId: data.activeRole
        };

        // create, set role data, publish!
        return storage.projects.new(userData, room)
            .then(_project => project = _project)
            .then(() => project.setRoles(data.roles))
            .then(() => {
                if (data.Public) {
                    return PublicProjects.publish(project);
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

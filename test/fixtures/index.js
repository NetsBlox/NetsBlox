// seed the database with the fixtures
const users = require('./users');
const projects = require('./projects');
const Q = require('q');
const hash = require('../../src/common/sha512').hex_sha512;
const PublicProjects = require('../../src/server/storage/public-projects');

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

            // create, set role data, publish!
            const {owner, name} = data;
            return storage.projects.new({owner, name})
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

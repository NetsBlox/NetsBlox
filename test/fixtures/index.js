const projects = require('./projects');
const Groups = require('../../src/server/storage/groups');
const groups = require('./groups');
const hash = require('../../src/common/sha512').hex_sha512;
const PublicProjects = require('../../src/server/storage/public-projects');

const Fixtures = {};
Fixtures.Users = require('./users');
Fixtures.libraries = require('./libraries');

Fixtures.init = function (storage, db) {
    Fixtures.libraries.init(storage, db);
};

Fixtures.seedDefaults = async function (storage) {
    // Add the users and the projects from the respective files!
    const {defaultUsers} = Fixtures.Users;
    const createUsers = defaultUsers.map(data => {  // create the users
        let user = storage.users.new(data.username, data.email);
        user.hash = hash(data.password);
        return user.save();
    });
    const createGroups = groups.map(data => {
        const {owner, name} = data;
        return Groups.new(name, owner);
    });

    await Promise.all(createUsers);
    await Promise.all(createGroups);
    await Promise.all(projects.map(async data => {
        // create, set role data, publish!
        const {owner, name, collaborators} = data;
        const project = await storage.projects.new({owner, name, collaborators});
        const promises = data.roles.map(role =>
            project.setRoleById(role.ProjectName + '-ID', role));
        await Promise.all(promises);
        if (data.Public) {
            await project.setPublic(true);
            await PublicProjects.publish(project);
        }
        if (!data.transient) {
            await project.persist();
        }
    }));
};

module.exports = Fixtures;

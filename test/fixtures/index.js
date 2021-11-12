const projects = require('./projects');
const Groups = require('../../src/server/storage/groups');
const groups = require('./groups');
const hash = require('../../src/common/sha512').hex_sha512;

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
    const createGroups = groups.map(async data => {
        const {owner, name, members=[]} = data;
        const group = await Groups.new(name, owner);
        await Promise.all(members.map(async userData => {
            const {username, email='user@netsblox.org', password='password'} = userData;
            let user = storage.users.new(username, email, group.getId());
            user.hash = hash(password);
            return user.save();
        }));
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
        }
        if (!data.transient) {
            await project.persist();
        }
    }));
};

module.exports = Fixtures;

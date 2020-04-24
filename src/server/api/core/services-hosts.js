const Logger = require('../../logger');
const Users = require('../../storage/users');
const Groups = require('../../storage/groups');
const Errors = require('./errors');
const Auth = require('./auth');
const P = Auth.Permission;

class CustomServicesHosts {
    constructor() {
        this.logger = new Logger('netsblox:custom-services-hosts');
    }

    async setUserServicesHosts(requestor, username, servicesHosts) {
        await Auth.ensureAuthorized(requestor, P.User.WRITE(username));
        const result = await Users.updateCustom({username}, {$set: {servicesHosts}});
        if (result.matchedCount === 0) {
            throw new Errors.UserNotFound(username);
        }
    }

    async deleteUserServicesHosts(requestor, name) {
        await Auth.ensureAuthorized(requestor, P.User.WRITE(name));
        return this.setUserServicesHosts(requestor, name, []);
    }

    async setGroupServicesHosts(requestor, groupId, servicesHosts) {
        await Auth.ensureAuthorized(requestor, P.Group.WRITE(groupId));
        const result = await Groups.update(groupId, {$set: {servicesHosts}});
        if (result.matchedCount === 0) {
            throw new Errors.GroupNotFound();
        }
    }

    async getUserHosts(requestor, username) {
        await Auth.ensureAuthorized(requestor, P.User.READ(username));
        const user = await Users.get(username);
        if (!user) {
            throw new Errors.UserNotFound(username);
        }

        return user.servicesHosts;
    }

    async getGroupHosts(requestor, groupId) {
        await Auth.ensureAuthorized(requestor, P.Group.READ(groupId));
        const group = await Groups.get(groupId)
            .catch(err => {
                if (err.message.includes('not found')) {
                    err = new Errors.GroupNotFound();
                }
                throw err;
            });

        return group.servicesHosts;
    }

    async deleteGroupServicesHosts(requestor, groupId) {
        await Auth.ensureAuthorized(requestor, P.Group.WRITE(groupId));
        return this.setGroupServicesHosts(requestor, groupId, []);
    }

    async getServicesHosts(requestor, username) {
        await Auth.ensureAuthorized(requestor, P.User.READ(username));
        const user = await Users.get(username);
        if (!user) {
            throw new Errors.UserNotFound(username);
        }

        const servicesHosts = user.servicesHosts.slice();
        const groups = await this._getAllGroups(user);
        groups.forEach(group => servicesHosts.push(...group.servicesHosts));
        return servicesHosts;
    }

    async _getAllGroups(user) {
        const groups = await Groups.findAllUserGroups(user.username);
        const group = await user.getGroup();
        if (group) {
            groups.push(group);
        }
        return groups;
    }
}

module.exports = new CustomServicesHosts();

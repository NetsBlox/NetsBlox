const Logger = require('../../logger');
const Users = require('../../storage/users');
const Groups = require('../../storage/groups');
const Errors = require('./errors');

class CustomServicesHosts {
    constructor() {
        this.logger = new Logger('netsblox:custom-services-hosts');
    }

    async setUserServicesHosts(username, servicesHosts) {
        const result = await Users.updateCustom({username}, {$set: {servicesHosts}});
        if (result.matchedCount === 0) {
            throw new Errors.UserNotFound(username);
        }
    }

    async deleteUserServicesHosts(name) {
        return this.setUserServicesHosts(name, []);
    }

    async setGroupServicesHosts(groupId, servicesHosts) {
        const result = await Groups.update(groupId, {$set: {servicesHosts}});
        if (result.matchedCount === 0) {
            throw new Errors.GroupNotFound();
        }
    }

    async getGroupHosts(groupId) {
        const group = await Groups.get(groupId)
            .catch(err => {
                if (err.message.includes('not found')) {
                    err = new Errors.GroupNotFound();
                }
                throw err;
            });

        return group.servicesHosts;
    }

    async deleteGroupServicesHosts(groupId) {
        return this.setGroupServicesHosts(groupId, []);
    }

    async getAllHosts(username) {
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

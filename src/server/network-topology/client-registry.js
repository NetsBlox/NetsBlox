// active client list
const NestedDict = require('./nested-dict');

class ClientRegistry {

    constructor() {
        this._clientsByUuid = {};
        this._clientsByUsername = new NestedDict();
        this._clientsByProjectRole = new NestedDict();
        this._eventHandlers = {};
    }

    add(client) {
        this._addEventHandlers(client);
        this._clientsByUuid[client.uuid] = client;
        this._addToRoleRecords(client);
        this._addToUsernameRecords(client);
    }

    remove(client) {
        delete this._clientsByUuid[client.uuid];
        this._removeFromRoleRecords(client);
        this._removeEventHandlers(client);
    }

    withUuid(uuid) {
        return this._clientsByUuid[uuid];
    }

    withUsername(name) {
        return this._clientsByUsername.getOr(name, []);
    }

    at(projectId, roleId) {
        const roleOccupants = this._clientsByProjectRole.getOr(projectId, roleId, []);
        return roleOccupants.slice();
    }

    atProject(projectId) {
        const roleOccupants = this._clientsByProjectRole.getOr(projectId, {});
        return Object.values(roleOccupants).flat();
    }

    count() {
        return Object.keys(this._clientsByUuid).length;
    }

    contains(client) {
        const myClient = this.withUuid(client.uuid);
        return !!myClient;
    }

    toArray() {
        return Object.values(this._clientsByUuid);
    }

    _addEventHandlers(client) {
        const updateHandler = (oldProjectId, oldRoleId) => {
            this._removeFromRoleRecords(client, oldProjectId, oldRoleId);
            this._addToRoleRecords(client);
        };

        const updateUsernameHandler = oldUsername => {
            this._removeFromUsernameRecords(client, oldUsername);
            this._addToUsernameRecords(client);
        };

        client.on('update', updateHandler);
        client.on('updateUsername', updateUsernameHandler);

        this._eventHandlers[client.uuid] = [updateHandler, updateUsernameHandler];
    }

    _removeEventHandlers(client) {
        const [updateHandler, updateUsernameHandler] = this._eventHandlers[client.uuid];
        client.off('update', updateHandler);
        client.off('updateUsername', updateUsernameHandler);
        delete this._eventHandlers[client.uuid];
    }

    _removeFromRoleRecords(client, projectId=client.projectId, roleId=client.roleId) {
        if (!projectId || !roleId) {
            return;
        }
        const clients = this._clientsByProjectRole.getOr(projectId, roleId, []);
        const index = clients.indexOf(client);
        if (index > -1) {
            clients.splice(index, 1);

            if (clients.length === 0) {
                this._clientsByProjectRole.delete(projectId, roleId);
            }
        }
    }

    _addToRoleRecords(client) {
        if (this._hasNoNetworkState(client)) {
            return;
        }

        const clients = this._clientsByProjectRole.getOrSet(client.projectId, client.roleId, []);
        clients.push(client);
    }

    _addToUsernameRecords(client) {
        if (client.loggedIn) {
            const clients = this._clientsByUsername.getOrSet(client.username, []);
            clients.push(client);
        }
    }

    _removeFromUsernameRecords(client, username=client.username) {
        const clients = this._clientsByUsername.getOrSet(username, []);
        const index = clients.indexOf(client);
        if (index > -1) {
            clients.splice(index, 1);
            if (clients.length === 0) {
                this._clientsByUsername.delete(username);
            }
        }
    }

    _hasNoNetworkState(client) {
        return !client.projectId || !client.roleId;
    }
}

module.exports = ClientRegistry;

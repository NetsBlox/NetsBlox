// active client list
class ClientRegistry {

    constructor() {
        this._clientsByUuid = {};
        this._clientsByProjectRole = {};
        this._eventHandlers = {};
    }

    add(client) {
        this._addEventHandlers(client);
        this._clientsByUuid[client.uuid] = client;
        this._addToRoleRecords(client);
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
        // TODO: This needs to be fast, too
    }

    at(projectId, roleId) {
        const roleOccupants = this._clientsByProjectRole[projectId] || {};
        const occupants = roleOccupants[roleId] || [];
        return occupants.slice();
    }

    atProject(projectId) {
        const roleOccupants = this._clientsByProjectRole[projectId] || {};
        return Object.values(roleOccupants).flat();
    }

    count() {
        return Object.keys(this._clientsByUuid).length;
    }

    contains(client) {
        const myClient = this.withUuid(client.uuid);
        if (myClient !== client) {
            // TODO
        }
        return !!myClient;
    }

    toArray() {
        return Object.values(this._clientsByUuid);
    }

    _cleanUpEmptyRecords(projectId, roleId) {
        const clients = this._clientsByProjectRole[projectId][roleId];
        if (clients.length === 0) {
            delete this._clientsByProjectRole[projectId][roleId];
            const roleCount = Object.keys(this._clientsByProjectRole[projectId]).length;
            if (roleCount === 0) {
                delete this._clientsByProjectRole[projectId];
            }
        }
    }

    _addEventHandlers(client) {
        const eventHandler = (oldProjectId, oldRoleId) => {
            this._removeFromRoleRecords(client, oldProjectId, oldRoleId);
            this._addToRoleRecords(client);
        };

        this._eventHandlers[client.uuid] = eventHandler;
        client.on('update', eventHandler);
    }

    _removeEventHandlers(client) {
        const handler = this._eventHandlers[client.uuid];
        client.off('update', handler);
        delete this._eventHandlers[client.uuid];
    }

    _removeFromRoleRecords(client, projectId=client.projectId, roleId=client.roleId) {
        if (!projectId || !roleId) {
            return;
        }
        const clients = this._clientsByProjectRole[projectId][roleId];
        const index = clients.indexOf(client);
        if (index > -1) {
            clients.splice(index, 1);
        }

        this._cleanUpEmptyRecords(projectId, roleId);
    }

    _addToRoleRecords(client) {
        if (this._hasNoNetworkState(client)) {
            return;
        }

        if (!this._clientsByProjectRole[client.projectId]) {
            this._clientsByProjectRole[client.projectId] = {};
        }
        if (!this._clientsByProjectRole[client.projectId][client.roleId]) {
            this._clientsByProjectRole[client.projectId][client.roleId] = [];
        }
        this._clientsByProjectRole[client.projectId][client.roleId].push(client);
    }

    _hasNoNetworkState(client) {
        return !client.projectId || !client.roleId;
    }
}

module.exports = ClientRegistry;

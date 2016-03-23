// This is a wrapper around the storage room. It provides the extra functionality expected
// of a room that is actively being used

'use strict';

var R = require('ramda'),
    _ = require('lodash'),
    utils = require('../ServerUtils');

class ActiveRoom {

    constructor(logger, name, owner) {
        var uuid = utils.uuid(owner.username, name);
        this.name = name;
        this._logger = logger.fork('ActiveRoom:' + uuid);
        this.uuid = uuid;

        // Seats
        this.roles = {};  // actual occupants
        this.cachedProjects = {};  // 

        this.owner = owner;

        // RPC contexts
        this.rpcs = {};

        // Saving
        this._store = null;

        this._logger.log('created!');
    }

    // This should only be called by the RoomManager (otherwise, the room will not be recorded)
    fork (logger, socket) {
        // Create a copy of the room with the socket as the new owner
        var fork = new ActiveRoom(logger, this.name, socket),
            roles = Object.keys(this.roles),
            data;

        // Clone the room storage data
        data = this._store.fork(fork);
        fork.setStorage(data);

        roles.forEach(role => fork.silentCreateRole(role));

        // Copy the data from each project
        fork.cachedProjects = _.cloneDeep(this.cachedProjects);

        // Notify the socket of the fork
        socket.send({
            type: 'project-fork',
            room: fork.name
        });
        fork.onRolesChanged();
        this.onRolesChanged();

        return fork;
    }

    add (socket, role) {
        this._logger.trace(`adding ${socket.uuid} to ${role}`);
        this.roles[role] = socket;
        this.onRolesChanged();  // Update all clients
    }

    createRole (role) {
        this.silentCreateRole(role);
        this.onRolesChanged();
    }

    silentCreateRole (role) {
        this._logger.trace(`Adding role ${role}`);
        this.roles[role] = null;
    }

    updateRole () {
        this.onRolesChanged();
    }

    removeRole (id) {
        this._logger.trace(`removing role "${id}"`);

        delete this.roles[id];

        this.check();
        this.onRolesChanged();
    }

    renameRole (roleId, newId) {
        var socket = this.roles[roleId];

        if (socket) {  // update socket, too!
            socket.roleId = newId;
        }

        this.roles[newId] = this.roles[roleId];
        this.cachedProjects[newId] = this.cachedProjects[roleId];

        delete this.roles[roleId];
        this.onRolesChanged();
        this.check();
    }

    getStateMsg () {
        var occupants = {},
            msg;

        Object.keys(this.roles)
            .forEach(role => {
                occupants[role] = this.roles[role] ? this.roles[role].username : null;
            });

        msg = {
            type: 'room-roles',
            owner: this.owner.username,
            name: this.name,
            occupants: occupants
        };
        return msg;
    }

    onRolesChanged () {
        // This should be called when the room layout changes
        // Send the room info to the socket
        var msg = this.getStateMsg();

        this.sockets().forEach(socket => socket.send(msg));

        this.save();
    }

    setStorage(store) {
        this._store = store;
    }

    save() {
        // TODO: Remove this fn
    }

    move (params) {
        var src = params.src || params.socket.roleId,
            socket = this.roles[src],
            dst = params.dst;

        this._logger.info(`moving from ${src} to ${dst}`);
        this.roles[src] = null;
        this.add(socket, dst);
        this.check();
    }

    sendFrom (socket, msg) {
        this.sockets()
            .filter(s => s !== socket)  // Don't send to origin
            .forEach(socket => socket.send(msg));
    }

    sockets () {
        return R.values(this.roles)
            .filter(socket => !!socket);
    }

    ownerCount () {
        return this.sockets()
            .map(socket => socket.username)
            .filter(name => name === this.owner.username)
            .length;
    }

    contains (username) {
        var roles = Object.keys(this.roles),
            socket;

        for (var i = roles.length; i--;) {
            socket = this.roles[roles[i]];
            if (socket && socket.username === username) {
                return true;
            }
        }
        return false;
    }

    update (name) {
        var oldUuid = this.uuid;
        this.name = name || this.name;
        this.uuid = utils.uuid(this.owner.username, this.name);
        this._logger.trace('Updating uuid to ' + this.uuid);

        if (this.uuid !== oldUuid) {
            this.onUuidChange(oldUuid);
        }
        if (name) {
            this.onRolesChanged();
        }
    }

    cache (role, callback) {
        var socket = this.roles[role];

        if (!socket) {
            let err = 'No socket in ' + role;
            this._logger.error(err);
            return callback(err);
        }
        this._logger.trace('caching ' + role);
        // Get the project json from the socket
        socket.getProjectJson((err, project) => {
            if (err) {
                return callback(err);
            }
            this.cachedProjects[role] = project;
            return callback(err);
        });
    }

    close () {
        // Remove all sockets from this group
        var msg = {type: 'project-closed'};
        this.sockets().forEach(socket => socket.send(msg));
        this.destroy();
    }
}

// Factory method
ActiveRoom.fromStore = function(logger, socket, data) {
    var room = new ActiveRoom(logger, data.name, socket);

    // Store the data
    room.setStorage(data);

    // Set up the roles
    room._uuid = data.uuid;  // save over the old uuid even if it changes
                              // this should be reset if the room is forked TODO
    // load cached projects
    room.cachedProjects = data.roles || data.seats;

    // Add the roles
    Object.keys(room.cachedProjects).forEach(role => room.roles[role] = null);
    return room;
};

module.exports = ActiveRoom;

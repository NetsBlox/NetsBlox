var debug = require('debug'),
    _ = require('lodash'),
    log = debug('NetsBlox:PublicRoleManager:log'),
    trace = debug('NetsBlox:PublicRoleManager:trace'),
    error = debug('NetsBlox:PublicRoleManager:error'),
    ID_LENGTH = 5;

var PublicRoleManager = function() {
    this.publicIds = {};
    this.socketToId = new Map();
};

PublicRoleManager.prototype.reset = function() {
    this.publicIds = {};
    this.socketToId = new Map();
};

PublicRoleManager.prototype._situation = function(socket) {
    if (!socket.hasRoom()) {
        error(`Socket does not have a room! ${socket.uuid}`);
        return null;
    }

    return {
        room: {
            owner: socket._room.owner.username,
            name: socket._room.name
        },
        role: socket.roleId
    };
};

PublicRoleManager.prototype.unregister = function(socket) {
    var id = this.socketToId.get(socket);

    this.socketToId.delete(socket);
    if (id) {
        delete this.publicIds[id];
        return true;
    }
    return false;
};

PublicRoleManager.prototype.register = function(socket) {
    var len = ID_LENGTH,
        id = Math.floor(Math.random()*Math.pow(10, len));

    while (this.publicIds[id]) {
        id = Math.floor(Math.random()*Math.pow(10, len));
        len++;
    }
    this.unregister(socket);  // only one id per user

    this.publicIds[id] = {
        socket,
        situation: this._situation(socket)
    };
    this.socketToId.set(socket, id);

    trace(`${socket.username} has requested public id ${id}`);
    socket.onclose.push(this.unregister.bind(this, socket));
    return id;
};

PublicRoleManager.prototype.lookUp = function(id) {
    var entry = this.publicIds[id];

    if (entry) {
        // Check that the socket is still in the room that it registered in
        if (_.isEqual(entry.situation, this._situation(entry.socket))) {
            return entry.socket;
        } else {
            log(`Found socket for ${id} but it is no longer in the given situation...`);
            return null;
        }
    }
    return null;
};

module.exports = new PublicRoleManager();

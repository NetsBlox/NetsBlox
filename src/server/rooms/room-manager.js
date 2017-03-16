'use strict';

var ActiveRoom = require('./active-room'),
    utils = require('../server-utils');

var RoomManager = function() {
    var self = this;
    this.rooms = {};

    ActiveRoom.prototype.onUuidChange = function(oldUuid) {
        var room = this;
        // update the rooms dictionary
        self._logger.trace(`moving record from ${oldUuid} to ${room.uuid}`);
        self.rooms[room.uuid] = room;
        delete self.rooms[oldUuid];
    };

    ActiveRoom.prototype.destroy = function() {
        this._logger.trace(`Removing room ${this.uuid}`);
        delete self.rooms[this.uuid];
    };

    ActiveRoom.prototype.check = function() {
        self.checkRoom(this);
    };

    ActiveRoom.prototype.getAllActiveFor = (socket) => {
        return Object.keys(this.rooms).map(uuid => this.rooms[uuid])
            .filter(room => room.owner.username === socket.username)
            .filter(room => room.owner !== socket)
            .map(room => room.name);

    };
};

RoomManager.prototype.init = function(logger, storage) {
    this._logger = logger.fork('rooms');
    this.storage = storage;
};

RoomManager.prototype.forkRoom = function(params) {
    var room = params.room,
        socket = params.socket || room.roles[params.roleId],
        newRoom;

    if (socket === room.owner) {
        this._logger.error(`${socket.username} tried to fork it's own room: ${room.name}`);
        return;
    }

    this._logger.trace(`${params.roleId} is forking room`);
    this._logger.trace(`${socket.username} is forking room ${room.uuid}`);

    // Create the new room
    newRoom = room.fork(this._logger, socket);
    this.rooms[newRoom.uuid] = newRoom;
    socket.join(newRoom);
};

RoomManager.prototype.createRoom = function(socket, name, ownerId) {
    ownerId = ownerId || socket.username;
    var uuid = utils.uuid(ownerId, name);
    if (this.rooms[uuid]) {
        this._logger.error('room already exists! (' + uuid + ')');
    }

    this.rooms[uuid] = new ActiveRoom(this._logger, name, socket);
    // Create the data element
    var data = this.storage.rooms.new(null, this.rooms[uuid]);
    this.rooms[uuid].setStorage(data);

    return this.rooms[uuid];
};

RoomManager.prototype.getRoom = function(socket, ownerId, name, callback) {
    var uuid = utils.uuid(ownerId, name);
    if (!this.rooms[uuid]) {
        this.storage.users.get(ownerId, (err, user) => {
            // Get the room
            var rooms = user && (user.rooms || user.tables),
                room = rooms && rooms.find(room => room.name === name);
            if (!room) {
                this._logger.error(err || 'No room found for ' + uuid);
                // If no room is found, create a new room for the user
                room = room || this.createRoom(socket, name, ownerId);
                this.rooms[uuid] = room;
                return callback(room);
            }

            this._logger.trace(`retrieving room ${uuid} from database`);
            var activeRoom = ActiveRoom.fromStore(this._logger, socket, room);
            this.rooms[uuid] = activeRoom;
            return callback(activeRoom);
        });

    } else {
        return callback(this.rooms[uuid]);
    }
};

RoomManager.prototype.checkRoom = function(room) {
    var uuid = room.uuid,
        roles = Object.keys(room.roles)
            .filter(role => !!room.roles[role]);

    this._logger.trace('Checking room ' + uuid + ' (' + roles.length + ')');
    if (roles.length === 0) {
        this._logger.trace('Removing empty room: ' + uuid);
        delete this.rooms[uuid];
    }
};

module.exports = new RoomManager();

'use strict';

const ActiveRoom = require('./active-room');
const utils = require('../server-utils');
const Q = require('q');
const Projects = require('../storage/projects');

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
        self._logger.trace(`Removing room ${this.uuid}`);
        delete self.rooms[this.uuid];
    };

    ActiveRoom.prototype.check = function() {
        self.checkRoom(this);
    };

    ActiveRoom.prototype.getAllActiveFor = (socket) => {
        return Object.keys(this.rooms).map(uuid => this.rooms[uuid])
            .filter(room => room.owner === socket.username)
            .filter(room => room !== socket.getRawRoom())
            .map(room => room.name);

    };
};

RoomManager.prototype.init = function(logger, storage) {
    this._logger = logger.fork('rooms');
    this.storage = storage;
};

RoomManager.prototype.forkRoom = function(room, socket) {
    var roleId = socket.roleId,
        newRoom;

    if (socket.username === room.owner) {
        this._logger.error(`${socket.username} tried to fork it's own room: ${room.name}`);
        return;
    }

    this._logger.trace(`${roleId} is forking room`);
    this._logger.trace(`${socket.username} (${roleId}) is forking room ${room.uuid}`);

    // Create the new room
    newRoom = room.fork(this._logger, socket);
    this.rooms[newRoom.uuid] = newRoom;
    socket.join(newRoom);
};

RoomManager.prototype.createRoom = function(socket, name, ownerId) {
    ownerId = ownerId || socket.username;

    this._logger.trace(`creating room ${name} for ${ownerId}`);
    var uuid = utils.uuid(ownerId, name);
    if (this.rooms[uuid]) {
        this._logger.error('room already exists! (' + uuid + ')');
    }

    this.rooms[uuid] = new ActiveRoom(this._logger, name, ownerId);

    // Create the data element
    var project = Projects.new(socket, this.rooms[uuid]);
    this.rooms[uuid].setStorage(project);

    return this.rooms[uuid];
};

RoomManager.prototype.getRoom = function(socket, ownerId, name) {
    const uuid = utils.uuid(ownerId, name);
    this._logger.trace(`getting project ${uuid} for ${ownerId}`);
    if (!this.rooms[uuid]) {
        this._logger.trace(`retrieving project ${uuid} for ${ownerId}`);
        return this.storage.users.get(ownerId)
            .then(user => user.getProject(name))
            .then(project => {
                if (!project) {
                    this._logger.error(`No project found for ${uuid}`);
                    // If no project is found, create a new project for the user
                    project = this.createRoom(socket, name, ownerId);
                    this.rooms[uuid] = project;
                    return project;
                }

                this._logger.trace(`retrieving project ${uuid} from database`);
                return ActiveRoom.fromStore(this._logger, socket, project);
            })
            .then(activeRoom => {
                this.rooms[uuid] = activeRoom;
                return activeRoom;
            });

    } else {
        return Q(this.rooms[uuid]);
    }
};

RoomManager.prototype.checkRoom = function(room) {
    var uuid = utils.uuid(room.owner, room.name),
        sockets = room.sockets();

    this._logger.trace('Checking room ' + uuid + ' (' + sockets.length + ')');
    if (sockets.length === 0) {
        this._logger.trace('Removing empty room: ' + uuid);
        room.close().then(() => delete this.rooms[uuid]);
    }
};

module.exports = new RoomManager();

'use strict';

const ActiveRoom = require('./active-room');
const _ = require('lodash');
const Projects = require('../storage/projects');
const Q = require('q');

var RoomManager = function() {
    var self = this;
    this.rooms = {};

    ActiveRoom.prototype.onUuidChange = function(oldUuid) {
        // This is no longer necessary since the ids are now permanent
        //var room = this;
        // update the rooms dictionary
        //self._logger.trace(`moving record from ${oldUuid} to ${room.uuid}`);
        //self.rooms[room.uuid] = room;
        //delete self.rooms[oldUuid];
    };

    ActiveRoom.prototype.check = function() {
        self.checkRoom(this);
    };

    ActiveRoom.prototype.getAllActiveFor = owner => {
        return _.values(this.rooms).filter(room => room.owner === owner);

    };
};

RoomManager.prototype.init = function(logger, storage) {
    this._logger = logger.fork('rooms');
    this.storage = storage;
};

RoomManager.prototype.forkRoom = function(room, socket) {
    var roleId = socket.role,
        newRoom;

    if (socket.username === room.owner) {
        this._logger.error(`${socket.username} tried to fork it's own room: ${room.name}`);
        return;
    }

    this._logger.trace(`${roleId} is forking room`);
    this._logger.trace(`${socket.username} (${roleId}) is forking room ${room.uuid}`);

    // Create the new room
    newRoom = room.fork(this._logger, socket);

    this.register(newRoom);
    socket.join(newRoom);
};

RoomManager.prototype.getProjectId = function(ownerId, name) {
    return Projects.getProjectId(ownerId, name);
};

RoomManager.prototype.createRoom = function(socket, name, ownerId) {
    ownerId = ownerId || socket.username;

    this._logger.trace(`creating room ${name} for ${ownerId}`);

    let room = new ActiveRoom(this._logger, name, ownerId);
    return Projects.new(socket, room)
        .then(project => {
            const id = project.getId();
            if (this.rooms[id]) {
                room = this.rooms[id];
            } else {
                room.setStorage(project);
                this.register(room);
            }

            return room;
        });
};

RoomManager.prototype.isActiveRoom = function(projectId) {
    return !!this.rooms[projectId];
};

RoomManager.prototype.getExistingRoom = function(owner, name) {
    const allRooms = this.getActiveRooms();
    return allRooms.find(room => room.owner === owner && room.name === name);
};

RoomManager.prototype.getExistingRoomById = function(projectId) {
    return this.rooms[projectId];
};

RoomManager.prototype.getRoom = function(socket, ownerId, name) {
    const prettyName = `"${name}" for "${ownerId}"`;
    this._logger.trace(`getting project ${prettyName}`);

    this._logger.trace(`retrieving project ${name} for ${ownerId}`);
    return Projects.getProject(ownerId, name)
        .then(project => {
            if (!project) {
                this._logger.error(`No project found for ${prettyName}`);
                // If no project is found, create a new project for the user
                return this.createRoom(socket, name, ownerId);
            }

            return this.getRoomForProject(project);
        });
};

RoomManager.prototype.getRoomForProject = function(project) {
    const id = project.getId();
    if (!this.rooms[id]) {  // create a room for the project
        return ActiveRoom.fromStore(this._logger, project)
            .then(room => {
                if (this.rooms[id]) return this.rooms[id];
                this.register(room);
                return room;
            });
    } else {
        return Q(this.rooms[id]);
    }
};

RoomManager.prototype.register = function(room) {
    const id = room.getProjectId();
    const prettyName = `"${room.name}" for "${room.owner}"`;

    if (!id) {
        this._logger.error(`Could not register room - missing project id! (${prettyName})`);
        return;
    }
    this.rooms[id] = room;
};

RoomManager.prototype.getActiveRoomIds = function() {
    return Object.keys(this.rooms);
};

RoomManager.prototype.getActiveRooms = function() {
    return _.values(this.rooms);
};

RoomManager.prototype.checkRoom = function(room) {
    const prettyName = `"${room.name}" for "${room.owner}"`;
    const id = room.getProjectId();
    const sockets = room.sockets();

    this._logger.trace(`Checking room ${prettyName} (${sockets.length})`);
    if (sockets.length === 0) {
        this._logger.trace(`Removing empty room: ${prettyName}`);
        delete this.rooms[id];
        room.close();
    }
};

module.exports = new RoomManager();

'use strict';

var DataWrapper = require('./Data'),
    async = require('async'),
    ObjectId = require('mongodb').ObjectId;

// Every time a room is saved, it is saved for some user AND in the global store
// Schema:
// + name
// + owner

class Room extends DataWrapper {
    constructor(params) {
        super(params.db, params.data || {});
        this._logger = params.logger.fork((this._room ? this._room.uuid : this.uuid));
        this._user = params.user;
        this._room = params.room;
    }

    fork(room) {
        var params;
        params = {
            user: this._user,
            room: room,
            logger: this._logger,
            db: this._db
        };
        this._logger.trace('forking (' + room.uuid + ')');
        return new Room(params);
    }

    // Override
    collectProjects(callback) {
        // Collect the projects from the websockets
        var sockets = this._room.sockets();
        // Add saving the cached projects
        async.map(sockets, (socket, callback) => {
            socket.getProjectJson(callback);
        }, (err, projects) => {
            if (err) {
                return callback(err);
            }

            // create the room from the projects
            var seats = Object.keys(this._room.seats),
                socket,
                k,
                content = {
                    owner: this._room.owner.username,
                    name: this._room.name,
                    seats: {}
                };

            for (var i = seats.length; i--;) {
                socket = this._room.seats[seats[i]];

                k = sockets.indexOf(socket);
                if (k !== -1) {
                    // seat content
                    content.seats[seats[i]] = projects[k];
                } else {
                    content.seats[seats[i]] = this._room.cachedProjects[seats[i]] || null;
                }
            }
            callback(null, content);
        });
    }

    // Override
    save(callback) {
        if (!this._user) {
            this._logger.trace('saving globally only');
            DataWrapper.prototype.save.call(this);
            return callback(null);
        }
        this.collectProjects((err, content) => {
            if (err) {
                this._logger.error('could not save room: ' + err);
                return callback(err);
            }
            this._logger.trace('collected projects for ' + this._user.username);
            this._content = content;
            this._save(callback);
        });
    }

    // Override
    _saveable() {
        if (this._user) {
            return this._content;
        }
        return DataWrapper.prototype._saveable.call(this);
    }

    _save(callback) {
        var room = this._saveable();

        // Every time a local room is saved, it is saved for the user AND in the global store
        var originalUuid = room._uuid;
        delete room._uuid;
        this._logger.trace(`saving as ${room.name}`);
        this._db.replaceOne(
            {uuid: originalUuid || room.uuid},  // search criteria
            room,  // new value
            {upsert: true},  // settings
            (e) => {
                if (e) {
                    this._logger.error(e);
                }
                this._logger.trace('updated in global room database');
                this._saveLocal(originalUuid, room, callback);
            }
        );
    }

    _saveLocal(uuid, room, callback) {
        // Add this project to the user's list of rooms and save the user
        uuid = uuid || room.uuid;
        var index = this._user.rooms.reduce((i, room, index) => {
            if (i > -1) {
                return i;
            }
            return room.owner === this._room.owner.username &&
                room.name === this._room.name ? index : i;
        }, -1);

        if (index === -1) {
            this._user.rooms.push(room);
        } else {
            this._user.rooms.splice(index, 1, room);
        }
        this._user.save();
        this._logger.log(`saved room "${room.name}" for ${this._user.username}`);
        callback(null);
    }

    pretty() {
        var prettyRoom = this._saveable();
        Object.keys(prettyRoom.seats || {})
            .forEach(seat => {
                if (prettyRoom.seats[seat]) {
                    prettyRoom.seats[seat] = '<project xml>';
                }
            });

        return prettyRoom;

    }

    destroy() {
        // remove the room from the user's list
        // TODO
        // set the user's 
        // TODO
    }
}

var EXTRA_KEYS = ['_user', '_room', '_content'];
Room.prototype.IGNORE_KEYS = DataWrapper.prototype.IGNORE_KEYS.concat(EXTRA_KEYS);

class RoomStore {
    constructor(logger, db) {
        this._logger = logger.fork('Rooms');
        this._rooms = db.collection('rooms');
    }

    get(uuid, callback) {
        // Get the room from the global store
        this._rooms.findOne({uuid}, (e, data) => {
            var params = {
                logger: this._logger,
                db: this._rooms,
                data
            };
            // The returned room is read-only (no user set)
            callback(e, data ? new Room(params) : null);
        });
    }

    // Create room from ActiveRoom (request projects from clients)
    new(user, activeRoom) {
        return new Room({
            logger: this._logger,
            db: this._rooms,
            user: user,
            room: activeRoom
        });
    }
}

module.exports = RoomStore;

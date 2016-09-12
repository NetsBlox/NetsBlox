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
        // Update seats => roles
        if (params && params.data) {
            params.data.roles = params.data.roles || params.data.seats;
            delete params.data.seats;
        }
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
            var roles = Object.keys(this._room.roles),
                socket,
                k,
                content = {
                    owner: this._room.owner.username,
                    name: this._room.name,
                    originTime: this._room.originTime || Date.now(),
                    roles: {}
                };

            for (var i = roles.length; i--;) {
                socket = this._room.roles[roles[i]];

                k = sockets.indexOf(socket);
                if (k !== -1) {
                    // role content
                    content.roles[roles[i]] = projects[k];
                } else {
                    content.roles[roles[i]] = this._room.cachedProjects[roles[i]] || null;
                }
            }
            callback(null, content);
        });
    }

    // Override
    save(callback) {
        if (!this._user) {
            this._logger.error(`Cannot save room "${this.name}" - no user`);
            return callback('Can\'t save table w/o user');
        }
        this.collectProjects((err, content) => {
            if (err) {
                this._logger.error('could not save room: ' + err);
                return callback(err);
            }
            this._logger.trace('collected projects for ' + this._user.username);
            if (this.activeRole) {
                content.activeRole = this.activeRole;
            }
            this._content = content;
            this._save(callback);
        });
    }

    setActiveRole(role) {
        this.activeRole = role;
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

        // Update the cache for each role
        this._logger.trace(`Updating the role cache for ${this._room.name} `+
            `(${Object.keys(room.roles).join(', ')})`);

        Object.keys(room.roles).forEach(role => 
            this._room.cachedProjects[role] = room.roles[role]
        );

        // Save the table under the owning user
        // var originalUuid = room._uuid;
        // delete room._uuid;
        // this._logger.trace(`saving as ${room.name}`);
        // this._db.replaceOne(
            // {uuid: originalUuid || room.uuid},  // search criteria
            // room,  // new value
            // {upsert: true},  // settings
            // (e) => {
                // if (e) {
                    // this._logger.error(e);
                // }
                // this._logger.trace('updated in global room database');
                this._saveLocal(room, callback);
            // }
        // );
    }

    _saveLocal(room, callback) {
        // Add this project to the user's list of rooms and save the user
        var index = this._user.rooms.reduce((i, room, index) => {
            if (i > -1) {
                return i;
            }
            return room.name === this._room.name ? index : i;
        }, -1);

        if (index === -1) {
            this._logger.log(`saving new room "${room.name}" for ${this._user.username}`);
            this._user.rooms.push(room);
        } else {
            this._logger.log(`overwriting existing room "${room.name}" for ${this._user.username}`);
            this._user.rooms.splice(index, 1, room);
        }
        this._user.save();
        this._logger.log(`saved room "${room.name}" for ${this._user.username}`);
        callback(null);
    }

    pretty() {
        var prettyRoom = this._saveable();
        Object.keys(prettyRoom.roles || {})
            .forEach(role => {
                if (prettyRoom.roles[role]) {
                    prettyRoom.roles[role] = '<project xml>';
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

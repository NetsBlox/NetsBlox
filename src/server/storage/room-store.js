'use strict';

var DataWrapper = require('./data'),
    async = require('async'),
    PublicProjectStore = require('./public-projects');

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
        this.lastUpdateAt = Date.now();
    }

    fork(room) {
        var params;
        params = {
            user: this._user,
            room: room,
            logger: this._logger,
            lastUpdateAt: Date.now(),
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
                    if (!projects[k]) {
                        this._logger.error(`requested project is falsey (${projects[k]}) at ${roles[i]} in ${this._room.uuid}`);
                    }
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
            return callback('Can\'t save project w/o user');
        }
        this.collectProjects((err, content) => {
            if (err) {
                this._logger.error('could not save room: ' + err);
                return callback(err);
            }
            this._logger.trace('collected projects for ' + this._user.username);

            // Check for 'null' roles
            var roleIds = Object.keys(content.roles),
                hasContent = false;

            for (var i = roleIds.length; i--;) {
                if (!content.roles[roleIds[i]]) {
                    this._logger.warn(`${this._user.username} saving project ` +
                        `(${this.name}) with null role (${roleIds[i]})! Will ` +
                        `try to proceed...`);
                } else {
                    hasContent = true;
                }
            }
            if (!hasContent) {  // only saving null role(s)
                err = `${this._user.username} tried to save a project w/ only ` +
                    `falsey roles (${this.name})!`;
                this._logger.error(err);
                return callback(err);
            }

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

        this._saveLocal(room, callback);
    }

    _saveLocal(room, callback) {
        // Add this project to the user's list of rooms and save the user
        var oldRoom,
            index = this._user.rooms.reduce((i, room, index) => {
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
            oldRoom = this._user.rooms.splice(index, 1, room)[0];
            room.Public = oldRoom.Public;
            if (room.Public) {
                this._logger.log(`updating published room "${room.name}" for ${this._user.username}`);
                PublicProjectStore.update(room);
            }
        }
        room.lastUpdateAt = Date.now();
        this._user.changed(room);
        return this._user.save()
            .then(() => {
                this._logger.log(`saved room "${room.name}" for ${this._user.username}`);
                callback(null);
            })
            .fail(err => {
                this._logger.error(`room save failed: ${err}`);
                callback(err);
            });
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

}

var EXTRA_KEYS = ['_user', '_room', '_content', '_changedRoles'];
Room.prototype.IGNORE_KEYS = DataWrapper.prototype.IGNORE_KEYS.concat(EXTRA_KEYS);

class RoomStore {
    constructor(logger, db) {
        this._logger = logger.fork('rooms');
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
            lastUpdateAt: Date.now(),
            room: activeRoom
        });
    }
}

module.exports = RoomStore;

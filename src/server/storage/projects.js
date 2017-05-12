(function(ProjectStorage) {

    var DataWrapper = require('./data'),
        async = require('async'),
        PublicProjectStore = require('./public-projects');

    class Project extends DataWrapper {
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
            return new Project(params);
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
        prepare(callback) {
            if (!this._user) {
                this._logger.error(`Cannot save room "${this.name}" - no user`);
                throw 'Can\'t save project w/o user';
            }
            this.collectProjects((err, content) => {
                if (err) {
                    this._logger.error('could not save room: ' + err);
                    throw err;
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
            return this._content;
        }

        _save(callback) {
            var room = this._saveable();

            // TODO: remove the cache and replace it with just saving the given role
            // Update the cache for each role
            this._logger.trace(`Updating the role cache for ${this._room.name} `+
                `(${Object.keys(room.roles).join(', ')})`);

            Object.keys(room.roles).forEach(role => 
                this._room.cachedProjects[role] = room.roles[role]
            );

            this._saveLocal(room, callback);
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
    Project.prototype.IGNORE_KEYS = DataWrapper.prototype.IGNORE_KEYS.concat(EXTRA_KEYS);

    // Project Storage
    var logger,
        collection;

    ProjectStorage.init = function (_logger, db) {
        logger = _logger.fork('projects');
        collection = db.collection('projects');
    };

    ProjectStorage.get = function (username, projectName, callback) {
        // Get the room from the global store
        // TODO: update this...
        collection.findOne({owner: username, name: projectName}, (e, data) => {
            var params = {
                logger: this._logger,
                db: collection,
                data
            };
            callback(e, data ? new Project(params) : null);
        });
    };

    ProjectStorage.getUserProjects = function (username) {
        return collection.find({owner: username}).toArray();
    };

    // Create room from ActiveRoom (request projects from clients)
    ProjectStorage.new = function(user, activeRoom) {
        return new Project({
            logger: logger,
            db: collection,
            user: user,
            lastUpdateAt: Date.now(),
            room: activeRoom
        });
    };

})(exports);

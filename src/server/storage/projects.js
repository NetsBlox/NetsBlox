(function(ProjectStorage) {

    const DataWrapper = require('./data');
    const Q = require('q');
    const _ = require('lodash');
    const blob = require('./blob-storage');

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

        collectProjects() {
            // Collect the projects from the websockets
            var sockets = this._room.sockets(),
                projects = sockets.map(socket => socket.getProjectJson());

            // Add saving the cached projects
            return Q.all(projects).then(projects => {
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
                return content;
            });
        }

        // Override
        prepare() {
            if (!this._user) {
                this._logger.error(`Cannot save room "${this.name}" - no user`);
                throw 'Can\'t save project w/o user';
            }
            return this.collectProjects()
                .then(content => {
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
                        throw err;
                    }

                    if (this.activeRole) {
                        content.activeRole = this.activeRole;
                    }

                    // Save the src, media to the blob
                    var roles = Object.keys(content.roles)
                        .map(name => content.roles[name]);

                    return Q.all(roles.map(storeRole))
                        .then(() => {
                            this._content = content;
                        });
                })
                .catch(err => {
                    this._logger.error(`saving ${this.name} failed: ${err}`);
                    throw err;
                });
        }

        setActiveRole(role) {
            this.activeRole = role;
        }

        // Override
        _saveable() {
            return this._content;
        }

        pretty() {
            var prettyRoom = _.cloneDeep(this._saveable());
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

    const cleanProject = function (project) {
        let allRoleNames = Object.keys(project.roles),
            removed = [],
            name;

        for (let i = allRoleNames.length; i--;) {
            name = allRoleNames[i];
            if (!project.roles[name]) {
                removed.push(name);
                delete project.roles[name];
            }
        }

        if (removed.length) {
            logger.warn(`Found ${removed.length} null roles in ${project.uuid}. Removing...`);
        }

        return project;
    };

    const loadProjectBinaryData = function(project) {
        cleanProject(project);

        var roles = Object.keys(project.roles).map(name => project.roles[name]);
        return Q.all(roles.map(loadRole))
            .then(() => project);
    };

    const loadRole = function(role) {
        const srcHash = role.SourceCode;
        const mediaHash = role.Media;
        return Q.all([blob.get(srcHash), blob.get(mediaHash)])
            .then(content => {
                [role.SourceCode, role.Media] = content;
                return role;
            });
    };

    const storeRole = function(role) {
        const src = role.SourceCode;
        const media = role.Media;
        return Q.all([blob.store(src), blob.store(media)])
            .then(content => {
                [role.SourceCode, role.Media] = content;
                return role;
            });
    };

    ProjectStorage.init = function (_logger, db) {
        logger = _logger.fork('projects');
        collection = db.collection('projects');
    };

    ProjectStorage.get = function (username, projectName) {
        return collection.findOne({owner: username, name: projectName})
            .then(data => {
                var params = {
                    logger: logger,
                    db: collection,
                    data
                };
                return data ? new Project(params) : null;
            });
    };

    ProjectStorage.getProject = function (username, projectName) {
        return ProjectStorage.get(username, projectName)
            .then(project => {
                var promise = Q(project);

                if (project) {
                    promise = loadProjectBinaryData(project);
                }
                return promise;
            });
    };

    ProjectStorage.getRawUserProjects = function (username) {
        return collection.find({owner: username}).toArray();
    };

    ProjectStorage.getUserProjects = function (username) {
        return ProjectStorage.getRawUserProjects(username)
            .then(projects => Q.all(projects.map(loadProjectBinaryData)));
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

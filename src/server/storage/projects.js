(function(ProjectStorage) {

    const DataWrapper = require('./data');
    const Q = require('q');
    const _ = require('lodash');
    const blob = require('./blob-storage');
    const utils = require('../server-utils');

    class Project extends DataWrapper {
        constructor(params) {
            params.data = _.extend(params.data || {});

            super(params.db, params.data || {});
            this._logger = params.logger.fork((this._room ? this._room.uuid : this.uuid));
            this._room = params.room;
            this.collaborators = this.collaborators || [];
        }

        fork(room) {
            const params = {
                room: room,
                logger: this._logger,
                lastUpdateAt: Date.now(),
                db: this._db
            };
            const data = this._saveable();
            data.owner = room.owner;
            params.data = data;

            this._logger.trace(`creating fork: ${room.uuid}`);
            return new Project(params);
        }

        ///////////////////////// Roles ///////////////////////// 
        setRawRole(role, content) {
            const query = {$set: {}};
            query.$set[`roles.${role}`] = content;
            return this._db.update(this.getStorageId(), query);
        }

        setRole(role, content) {
            this._logger.trace(`updating role: ${role}`);
            return Q.all([
                blob.store(content.SourceCode),
                blob.store(content.Media)
            ])
            .then(hashes => {
                const [srcHash, mediaHash] = hashes;

                content.SourceCode = srcHash;
                content.Media = mediaHash;
                return this.setRawRole(role, content);
            });
        }

        getRawRole(role) {
            return this._db.findOne(this.getStorageId())
                .then(project => project.roles[role]);
        }

        getRole(role) {
            return this.getRawRole(role)
                .then(content => {
                    return Q.all([
                        blob.get(content.SourceCode),
                        blob.get(content.Media)
                    ])
                    .then(data => {
                        const [code, media] = data;
                        content.SourceCode = code;
                        content.Media = media;
                        return content;
                    });
                });
        }

        cloneRole(role, newName) {
            return this.getRawRole(role)
                .then(content => this.setRawRole(newName, content));
        }

        removeRole(role) {
            var query = {$unset: {}};
            query.$unset[`roles.${role}`] = '';
            this._logger.trace(`removing role: ${role}`);
            return this._db.update(this.getStorageId(), query);
        }

        renameRole(role, newName) {
            var query = {$rename: {}};
            query.$rename[`roles.${role}`] = `roles.${newName}`;

            this._logger.trace(`renaming role: ${role} -> ${newName}`);
            return this._db.update(this.getStorageId(), query);
        }

        getRoleNames () {
            return this._db.findOne(this.getStorageId())
                .then(project => Object.keys(project.roles));
        }

        getRawRoles () {
            return this._db.findOne(this.getStorageId())
                .then(project =>
                    Object.keys(project.roles).map(name => project.roles[name])
                );
        }

        ///////////////////////// End Roles ///////////////////////// 
        collectProjects() {
            var sockets = this._room ? this._room.sockets() : [];
            // Add saving the cached projects
            return Q.all(sockets.map(socket => socket.getProjectJson()))
                .then(projects => {
                    // create the room from the projects
                    var roles = [];

                    sockets.forEach((socket, i) => roles.push([socket.roleId, projects[i]]));

                    return roles;
                });
        }

        clean () {
            return this.getRoleNames()
                .then(allRoleNames => {
                    let removed = [],
                        name;

                    for (let i = allRoleNames.length; i--;) {
                        name = allRoleNames[i];
                        if (!this.roles[name]) {
                            removed.push(name);
                            delete this.roles[name];
                        }
                    }

                    if (removed.length) {
                        logger.warn(`Found ${removed.length} null roles in ${this.uuid}. Removing...`);
                    }

                    return this;
                });
        }


        // Override
        save() {
            const query = {$set: {}};
            return this.collectProjects()
                .then(roles => {
                    this._logger.trace('collected projects for ' + this.owner);

                    this.clean();  // remove any null roles

                    query.$set.lastUpdateAt = Date.now();
                    return Q.all(roles.map(pair => {
                        let [name, role] = pair;
                        return Q.all([blob.store(role.SourceCode), blob.store(role.Media)])
                            .then(hashes => {
                                let [srcHash, mediaHash] = hashes;
                                role.SourceCode = srcHash;
                                role.Media = mediaHash;
                                query.$set[`roles.${name}`] = role;
                            });
                    }));
                })
                .then(() => {
                    // Update the owner id if necessary
                    const nameChanged = this.name !== this._room.name;
                    const ownerLoggedIn = utils.isSocketUuid(this.owner) &&
                        this._room.owner !== this.owner;

                    if (ownerLoggedIn || nameChanged) {
                        query.$set.owner = this._room.owner;
                        query.$set.name = this._room.name;
                    }

                    return this._db.update(this.getStorageId(), query, {upsert: true})
                        .then(() => {
                            this._logger.trace(`saved project ${this.owner}/${this.name}`);
                            this.owner = query.$set.owner || this.owner;
                            this.name = query.$set.name || this.name;
                        });
                });
        }

        setActiveRole(role) {
            this.activeRole = role;
        }

        persist() {  // save in the non-transient storage
            this.destroy();
            this._db = collection;
            return this.save();
        }

        isTransient() {
            return this._db === transientCollection;
        }

        addCollaborator(username) {
            if (this.collaborators.includes(username)) return;
            this.collaborators.push(username);
            this._logger.info(`added collaborator ${username} to ${this.name}`);
        }

        removeCollaborator(username) {
            var index = this.collaborators.indexOf(username);
            if (index === -1) return;
            this.collaborators.splice(index, 1);
            this._logger.info(`removed collaborator ${username} from ${this.name}`);
        }

        getStorageId() {
            return {
                name: this.name,
                owner: this.owner
            };
        }

        pretty() {
            var prettyRoom = {
                name: this.name,
                roles: {},
                owner: this.owner,
                collaborators: this.collaborators
            };

            Object.keys(this.roles || {})
                .forEach(role => {
                    if (prettyRoom.roles[role]) {
                        prettyRoom.roles[role] = '<project xml>';
                    }
                });

            return prettyRoom;
        }
    }

    var EXTRA_KEYS = ['_room'];
    Project.prototype.IGNORE_KEYS = DataWrapper.prototype.IGNORE_KEYS.concat(EXTRA_KEYS);

    // Project Storage
    var logger,
        collection,
        transientCollection;

    //const loadProjectBinaryData = function(project) {
        //project.clean();

        //var roles = Object.keys(project.roles).map(name => project.roles[name]);
        //return Q.all(roles.map(loadRole))
            //.then(() => project);
    //};

    //const loadRole = function(role) {
        //const srcHash = role.SourceCode;
        //const mediaHash = role.Media;
        //return Q.all([blob.get(srcHash), blob.get(mediaHash)])
            //.then(content => {
                //[role.SourceCode, role.Media] = content;
                //return role;
            //});
    //};

    ProjectStorage.init = function (_logger, db) {
        logger = _logger.fork('projects');
        collection = db.collection('projects');
        transientCollection = db.collection('unsaved-projects');
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
        return ProjectStorage.get(username, projectName);
    };

    ProjectStorage.getSharedProject = function (owner, projectName, user) {
        return collection.findOne({owner: owner, name: projectName, collaborators: user})
            .then(data => {
                const params = {
                    logger: logger,
                    db: collection,
                    data
                };
                return data ? new Project(params) : null;
            });
    };

    ProjectStorage.getRawUserProjects = function (username) {
        return collection.find({owner: username}).toArray();
    };

    ProjectStorage.getUserProjects = function (username) {
        return ProjectStorage.getRawUserProjects(username)
            .then(data => data.map(d => new Project({
                logger: logger,
                db: collection,
                data: d
            })))
            .catch(e => {
                logger.error(`getting user projects errored: ${e}`);
                throw e;
            });
    };

    ProjectStorage.getRawSharedProjects = function (username) {
        return collection.find({collaborators: username}).toArray();
    };

    ProjectStorage.getSharedProjects = function (username) {
        return ProjectStorage.getRawSharedProjects(username)
            .then(data => data.map(d => new Project({
                logger: logger,
                db: collection,
                data: d
            })))
            .catch(e => {
                logger.error(`getting shared projects errored: ${e}`);
                throw e;
            });
    };

    // Create room from ActiveRoom (request projects from clients)
    const getDefaultProjectData = function(user, room) {
        return {
            owner: user.username,
            name: room.name,
            originTime: room.originTime,
            activeRole: user.roleId,
            collaborators: room.collaborators,
            roles: {}
        };
    };

    ProjectStorage.new = function(user, activeRoom) {
        // TODO: check for the room in the transient collection...
        return new Project({
            logger: logger,
            db: transientCollection,
            data: getDefaultProjectData(user, activeRoom),
            room: activeRoom
        });
    };

})(exports);

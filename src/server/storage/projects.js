(function(ProjectStorage) {

    const DataWrapper = require('./data');
    const Q = require('q');
    const _ = require('lodash');
    const blob = require('./blob-storage');
    const utils = require('../server-utils');

    const loadRoleContent = function(role) {
        return Q.all([
            blob.get(role.SourceCode),
            blob.get(role.Media)
        ])
        .then(data => {
            const [code, media] = data;
            role.SourceCode = code;
            role.Media = media;
            return role;
        });
    };

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

        getRawProject() {
            return this._db.findOne(this.getStorageId())
                .then(project => {
                    if (!project.roles) {
                        this._logger.warn(`PROJECT FOUND WITH NO ROLES ${project.name}/${project.owner}`);
                        project.roles = {};
                        project.roles.myRole = utils.getEmptyRole('myRole');
                    }
                    return project;
                });
        }

        ///////////////////////// Roles ///////////////////////// 
        setRawRole(role, content) {
            const query = {$set: {}};
            query.$set[`roles.${role}`] = content;
            return this._db.update(this.getStorageId(), query);
        }

        setRole(role, content) {
            this._logger.trace(`updating role: ${role}`);
            content.ProjectName = role;
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
            return this.getRawProject()
                .then(project => {
                    const content = project.roles[role];
                    content.ProjectName = role;
                    return content;
                });
        }

        getRole(role) {
            return this.getRawRole(role)
                .then(content => loadRoleContent(content));
        }

        getRawRoles() {
            return this.getRawProject()
                .then(project => {
                    return Object.keys(project.roles)
                        .map(name => {
                            const content = project.roles[name];
                            content.ProjectName = name;
                            return content;
                        });
                });
        }

        getRoles() {
            return this.getRawRoles()
                .then(roles => Q.all(roles.map(loadRoleContent)));
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
            return this.getRawProject()
                .then(project => Object.keys(project.roles));
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

        // Override
        save() {
            const query = {$set: {}};
            return this.collectProjects()
                .then(roles => {
                    this._logger.trace('collected projects for ' + this.owner);

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
                    if (this._room) {  // update if attached to a room
                        const nameChanged = this.name !== this._room.name;
                        const ownerLoggedIn = utils.isSocketUuid(this.owner) &&
                            this._room.owner !== this.owner;

                        if (ownerLoggedIn) {
                            query.$set.owner = this._room.owner;
                        }

                        if (nameChanged) {
                            query.$set.name = this._room.name;
                            this.name = query.$set.name;
                            this._logger.trace(`renaming project ${this.name}->${this._room.name}`);
                        }
                    }

                    return this._db.update(this.getStorageId(), query, {upsert: true})
                        .then(() => {
                            this._logger.trace(`saved project ${this.owner}/${this.name}`);
                            this.owner = query.$set.owner || this.owner;
                        });
                });
        }

        setActiveRole(role) {
            this.activeRole = role;
        }

        persist() {  // save in the non-transient storage
            if (this.isTransient()) {
                this.destroy();
                this._db = collection;
            }
            return this.save();
        }

        isTransient() {
            return this._db === transientCollection;
        }

        setPublic(isPublic) {
            const query = {$set: {Public: isPublic === true}};
            return this._db.update(this.getStorageId(), query, {upsert: true});
        }

        addCollaborator(username) {
            if (this.collaborators.includes(username)) return Q();
            this.collaborators.push(username);

            return this._updateCollaborators().then(() => {
                this._logger.info(`added collaborator ${username} to ${this.name}`);
            });
        }

        removeCollaborator(username) {
            var index = this.collaborators.indexOf(username);
            if (index === -1) return Q();
            this.collaborators.splice(index, 1);
            this._logger.info(`removed collaborator ${username} from ${this.name}`);

            return this._updateCollaborators().then(() => {
                this._logger.info(`added collaborator ${username} to ${this.name}`);
            });
        }

        _updateCollaborators() {
            const query = {$set: {collaborators: this.collaborators}};
            return this._db.update(this.getStorageId(), query, {upsert: true});
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
        return collection.find({owner: username}).toArray()
            .then(projects => {
                const validProjects = projects.filter(project => !!project);
                if (validProjects.length < projects.length) {
                    logger.warn(`Found invalid project for ${username}. Removing...`);
                }

                return projects;
            });
    };

    ProjectStorage.getAllRawUserProjects = function (username) {
        // Get names from saved and transient projects
        return Q.all([
            collection.find({owner: username}).toArray(),
            transientCollection.find({owner: username}).toArray()
        ]).then(groups => groups[0].concat(groups[1]));
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
            collaborators: room.getCollaborators(),
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

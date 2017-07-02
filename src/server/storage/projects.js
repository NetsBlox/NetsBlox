(function(ProjectStorage) {

    const DataWrapper = require('./data');
    const Q = require('q');
    const _ = require('lodash');
    const blob = require('./blob-storage');
    const utils = require('../server-utils');

    const storeRoleBlob = function(role) {
        const content = _.clone(role);
        return Q.all([
            blob.store(content.SourceCode),
            blob.store(content.Media)
        ])
        .then(hashes => {
            const [srcHash, mediaHash] = hashes;

            content.SourceCode = srcHash;
            content.Media = mediaHash;
            return content;
        });
    };

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
                    delete project._id;
                    return project;
                });
        }

        ///////////////////////// Roles ///////////////////////// 
        setRawRole(role, content) {
            const query = {$set: {}};
            content.ProjectName = role;

            query.$set[`roles.${role}`] = content;
            return this._db.update(this.getStorageId(), query);
        }

        setRole(role, content) {
            this._logger.trace(`updating role: ${role} in ${this.owner}/${this.name}`);
            return storeRoleBlob(content)
                .then(content => this.setRawRole(role, content));
        }

        setRoles(roles) {
            const query = {$set: {}};

            return Q.all(roles.map(role => storeRoleBlob(role)))
                .then(roles => {
                    const names = roles.map(role => role.ProjectName);
                    roles.forEach(role => query.$set[`roles.${role.ProjectName}`] = role);
                    this._logger.trace(`updating roles: ${names.join(',')} in ${this.owner}/${this.name}`);
                    return this._db.update(this.getStorageId(), query);
                });
        }

        getRawRole(role) {
            return this.getRawProject()
                .then(project => {
                    const content = project.roles[role];
                    if (content) {
                        content.ProjectName = role;
                    }
                    return content;
                });
        }

        getRole(role) {
            return this.getRawRole(role)
                .then(content => content && loadRoleContent(content));
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
            var sockets = this._room ?
                this._room.getRoleNames()
                    .map(name => this._room.getSocketsAt(name)[0])
                    .filter(socket => !!socket) : [];

            // Request the project from the first socket
            // if the request fails, continue with the ones that succeed
            const jsons = sockets.map(socket =>
                socket.getProjectJson()
                    .catch(err => {
                        this._logger.warn('could not save project at ' +
                            `${socket.roleId} in ${this.owner}/${this.name}: ${err}`);
                        return null;
                    })
            );
            return Q.all(jsons)
                .then(roles => roles.filter(role => !!role));
        }

        collectSaveableRoles() {
            return this.collectProjects()
                .then(roles => Q.all(roles.map(role => storeRoleBlob(role))));
        }


        create() {  // initial save
            return this.collectSaveableRoles()
                .then(roles => {
                    const roleDict = {};
                    const data = {
                        name: this.name,
                        owner: this.owner,
                        transient: true,
                        lastUpdatedAt: Date.now(),
                        originTime: Date.now(),
                        collaborators: this.collaborators,
                        roles: roleDict
                    };

                    roles.forEach(role => roleDict[role.ProjectName] = role);
                    return this._db.save(data);
                })
                .then(() => this);
        }

        save() {
            const query = {$set: {}};

            this._logger.trace(`saving project ${this.owner}/${this.name}`);
            return this.collectSaveableRoles()
                .then(roles => {
                    const roleNames = roles.map(role => role.ProjectName);
                    this._logger.trace(`updated roles are ${roleNames.join(',')}`);
                    roles.forEach(role => query.$set[`roles.${role.ProjectName}`] = role);
                    query.$set.lastUpdateAt = Date.now();

                    if (this._room) {  // update if attached to a room
                        const nameChanged = this.name !== this._room.name;
                        const ownerLoggedIn = utils.isSocketUuid(this.owner) &&
                            this._room.owner !== this.owner;

                        if (ownerLoggedIn) {
                            query.$set.owner = this._room.owner;
                        }

                        if (nameChanged) {
                            query.$set.name = this._room.name;
                            return this.getRawProject()
                                .then(project => {
                                    if (!project.transient) {  // create a copy
                                        this.name = query.$set.name;
                                        delete project.roles;
                                        query.$set = _.extend({}, project, query.$set);
                                        this._logger.trace(`duplicating project (save as) ${this.name}->${this._room.name}`);
                                    } else {
                                        this._logger.trace(`renaming project ${this.name}->${this._room.name}`);
                                    }
                                });
                        }
                    }
                    return Q();
                })
                .then(() => this._db.update(this.getStorageId(), query, {upsert: true}))
                .then(() => {
                    this._logger.trace(`saved project ${this.owner}/${this.name}`);
                    this.owner = query.$set.owner || this.owner;
                    this.name = query.$set.name || this.name;
                });
        }

        setActiveRole(role) {
            this.activeRole = role;
        }

        persist() {
            const query = {$set: {transient: false}};
            return this._db.update(this.getStorageId(), query, {upsert: true})
                .then(() => this.save());
        }

        isTransient() {
            return this.getRawProject()
                .then(project => !!project.transient);
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
        collection;

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
        return collection.find({owner: username, transient: {$ne: true}}).toArray()
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
            collaborators: room.getCollaborators(),
            roles: {}
        };
    };

    ProjectStorage.new = function(user, activeRoom) {
        const project = new Project({
            logger: logger,
            db: collection,
            data: getDefaultProjectData(user, activeRoom),
            room: activeRoom
        });

        return project.create();
    };

})(exports);

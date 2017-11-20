(function(ProjectStorage) {

    const DataWrapper = require('./data');
    const Q = require('q');
    const _ = require('lodash');
    const blob = require('./blob-storage');
    const utils = require('../server-utils');
    const PublicProjects = require('./public-projects');

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

    const clean = function(project, logger) {
        if (!project.roles) {
            logger.warn(`PROJECT FOUND WITH NO ROLES ${project.owner}/${project.name}`);
            project.roles = {};
            project.roles.myRole = utils.getEmptyRole('myRole');
        }
        delete project._id;
        return project;
    };

    class Project extends DataWrapper {
        constructor(params) {
            params.data = params.data || {};

            super(params.db, params.data || {});
            this._logger = params.logger.fork((this._room ? this._room.uuid : this.uuid));
            this._room = params.room;
            this.collaborators = this.collaborators || [];
            this.originTime = params.data.originTime;
        }

        uuid() {
            return utils.uuid(this.owner, this.name);
        }

        fork(room) {
            const params = {
                room: room,
                logger: this._logger,
                lastUpdatedAt: Date.now(),
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
                    clean(project, this._logger);
                    return project;
                });
        }

        ///////////////////////// Roles ///////////////////////// 
        setRawRole(role, content) {
            if (this.isDeleted()) return Promise.reject('cannot setRawRole: project has been deleted!');

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
            if (this.isDeleted()) return Promise.reject('cannot call setRoles: project has been deleted!');
            if (!roles.length) return Q();

            const query = {$set: {}};

            return Q.all(roles.map(role => storeRoleBlob(role)))
                .then(roles => {
                    if (this.isDeleted()) throw new Error('cannot complete setRoles: project has been deleted!');
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

        getCopy(user) {
            const owner = user.username;
            return this.getRawProject()
                .then(raw => {

                    return user.getNewName(raw.name)
                        .then(name => {
                            raw.originTime = Date.now();
                            raw.name = name;
                            raw.owner = owner;
                            raw.collaborators = [];
                            raw.transient = true;

                            const project = new Project({
                                logger: this._logger,
                                db: this._db,
                                data: raw
                            });
                            return project.create(raw.roles);
                        });
                });
        }

        cloneRole(role, newName) {
            return this.getRawRole(role)
                .then(content => this.setRawRole(newName, content));
        }

        removeRole(role) {
            if (this.isDeleted()) return Promise.reject('cannot removeRole: project has been deleted!');
            var query = {$unset: {}};
            query.$unset[`roles.${role}`] = '';
            this._logger.trace(`removing role: ${role}`);
            return this._db.update(this.getStorageId(), query);
        }

        renameRole(role, newName) {
            if (this.isDeleted()) return Promise.reject('cannot renameRole: project has been deleted!');
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


        create(roleDict) {  // initial save
            return this.collectSaveableRoles()
                .then(roles => {
                    roleDict = roleDict || {};
                    const data = {
                        name: this.name,
                        owner: this.owner,
                        transient: true,
                        lastUpdatedAt: Date.now(),
                        originTime: this.originTime,
                        collaborators: this.collaborators,
                        activeRole: this.activeRole,
                        roles: roleDict
                    };

                    roles.forEach(role => roleDict[role.ProjectName] = role);
                    return this._db.save(data);
                })
                .then(result => {
                    let id = result.ops[0]._id;
                    this._id = id;
                })
                .then(() => this);
        }

        save() {
            const query = {$set: {}};
            const options = {};

            this._logger.trace(`saving project ${this.owner}/${this.name}`);
            return this.collectSaveableRoles()
                .then(roles => {
                    if (this.isDeleted()) return;
                    const roleNames = roles.map(role => role.ProjectName);
                    this._logger.trace(`updated roles are ${roleNames.join(',')}`);
                    roles.forEach(role => query.$set[`roles.${role.ProjectName}`] = role);
                    query.$set.lastUpdatedAt = Date.now();

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
                                    if (this.isDeleted()) return;

                                    if (!project.transient) {  // create a copy
                                        this._logger.trace(`duplicating project (save as) ${this.name}->${this._room.name}`);
                                        this.name = query.$set.name;
                                        // covert the roles keys to match expected format
                                        Object.keys(project.roles).forEach(roleId => {
                                            project[`roles.${roleId}`] = project.roles[roleId];
                                        });
                                        delete project.roles;

                                        this.originTime = Date.now();
                                        project.originTime = this.originTime;
                                        this._room.originTime = this.originTime;

                                        query.$set = _.extend({}, project, query.$set);
                                        options.upsert = true;
                                    } else {
                                        this._logger.trace(`renaming project ${this.name}->${this._room.name}`);
                                    }
                                });
                        }
                    }
                    return Q();
                })
                .then(() => {
                    if (this.isDeleted()) return;
                    this._db.update(this.getStorageId(), query, options);
                })
                .then(() => {
                    if (this.isDeleted()) {
                        this._logger.trace(`project has been deleted while saving: ${this.uuid()}`);
                        return;
                    }
                    this._logger.trace(`saved project ${this.owner}/${this.name}`);
                    this.owner = query.$set.owner || this.owner;
                    this.name = query.$set.name || this.name;
                })
                .catch(err => {
                    this._logger.warn(`project not saved: ${err}`);
                    throw err;
                });
        }

        setActiveRole(role) {
            this.activeRole = role;
        }

        persist() {
            if (this.isDeleted()) return Promise.reject('cannot call persist: project has been deleted!');
            const query = {$set: {transient: false}};
            this._logger.trace(`persisting project ${this.owner}/${this.name}`);
            return this._db.update(this.getStorageId(), query)
                .then(() => this.save());
        }

        unpersist() {
            if (this.isDeleted()) return Promise.reject('cannot call unpersist: project has been deleted!');
            const query = {$set: {transient: true}};
            this._logger.trace(`unpersisting project ${this.owner}/${this.name}`);
            return this._db.update(this.getStorageId(), query)
                .then(() => this.save());
        }

        isTransient() {
            return this.getRawProject()
                .then(project => !!project.transient);
        }

        setPublic(isPublic) {
            if (this.isDeleted()) return Promise.reject('cannot call setPublic: project has been deleted!');
            const query = {$set: {Public: isPublic === true}};
            return this._db.update(this.getStorageId(), query);
        }

        setName(name) {
            if (this.isDeleted()) return Promise.reject('cannot setName: project has been deleted!');
            const query = {$set: {name: name}};
            this._logger.trace(`renaming project ${this.name}=>${name} for ${this.owner}`);
            return this.getRawProject()
                .then(project => {
                    const isPublic = project.Public === true;
                    if (isPublic) {
                        return PublicProjects.rename(this.owner, this.name, name);
                    }
                })
                .then(() => this._db.update(this.getStorageId(), query))
                .then(() => this.name = name);
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
            if (this.isDeleted()) return Promise.reject('cannot update collaborators: project has been deleted!');

            const query = {$set: {collaborators: this.collaborators}};
            return this._db.update(this.getStorageId(), query);
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

    ProjectStorage.getRawProject = function (username, projectName) {
        return collection.findOne({owner: username, name: projectName});
    };

    ProjectStorage.get = function (username, projectName) {
        return ProjectStorage.getRawProject(username, projectName)
            .then(data => {
                var params = {
                    logger: logger,
                    db: collection,
                    data
                };
                return data ? new Project(params) : null;
            });
    };

    ProjectStorage.getTransientProject = function (username, projectName) {
        return collection.findOne({owner: username, name: projectName, transient: true})
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

                return projects.map(project => clean(project, logger));
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

    ProjectStorage.getCollection = function () {
        return collection;
    };

    ProjectStorage.map = function(query, fn){
        let deferred = Q.defer();
        let results = [];
        collection.find(query).forEach(doc => {
            let params = {
                logger: logger,
                db: collection,
                data: doc,
            };
            let project = new Project(params);
            results.push(fn(project));
        }, () => deferred.resolve(results));
        return deferred.promise;
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

    ProjectStorage.new = function(user, room) {
        const project = new Project({
            logger: logger,
            db: collection,
            data: getDefaultProjectData(user, room),
            room: room
        });

        return project.create();
    };

})(exports);

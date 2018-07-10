(function(ProjectStorage) {

    const assert = require('assert');
    const DataWrapper = require('./data');
    const ObjectId = require('mongodb').ObjectId;
    const Q = require('q');
    const _ = require('lodash');
    const blob = require('./blob');
    const utils = require('../server-utils');
    const PublicProjects = require('./public-projects');
    const MAX_MSG_RECORD_DURATION = 1000 * 60 * 10;  // 10 min

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
        // TODO: ensure that role names don't collide?
        return project;
    };

    class Project extends DataWrapper {
        constructor(params) {
            params.data = params.data || {};

            super(params.db, params.data || {});
            this._logger = params.logger.fork((this._room ? this._room.uuid : this.uuid()));
            this._room = params.room;
            this.collaborators = this.collaborators || [];
            this.originTime = params.data.originTime;
        }

        uuid() {
            return utils.uuid(this.owner, this.name);
        }

        getId() {
            return this._id;
        }

        fork(room) {
            const params = {
                room: room,
                logger: this._logger,
                lastUpdatedAt: new Date(),
                db: this._db
            };
            const data = this._saveable();
            data.owner = room.owner;
            params.data = data;

            this._logger.trace(`creating fork: ${room.uuid}`);
            return new Project(params);
        }

        getRawProject() {
            return Q(this._db.findOne(this.getStorageId()))
                .then(project => {
                    if (!project) {
                        let msg = `could not find project ${this.uuid()}`;
                        this._logger.error(msg);
                        throw new Error(msg);
                    }
                    clean(project, this._logger);
                    return project;
                });
        }

        setOwner(name) {
            const query = {$set: {owner: name}};
            return this._execUpdate(query)
                .then(() => this.owner = name);
        }

        ///////////////////////// Roles /////////////////////////
        getNewRoleId(name) {
            return `${name}-${Date.now()}`;
        }

        setRawRole(name, content) {
            if (this.isDeleted()) return Promise.reject('cannot setRawRole: project has been deleted!');

            content.ProjectName = name;
            this._logger.trace(`about to update role ${name}`);
            return this.getRoleId(name)
                .then(id => this.setRawRoleById(id, content));
        }

        setRawRoleById(id, content) {
            assert(content.ProjectName);
            const query = this.addSetRoleToQuery(id, content);
            return this._execUpdate(query);
        }

        setRoleById(id, content) {
            assert(content.ProjectName);
            this.addRoleMetadata(content);
            return storeRoleBlob(content)
                .then(content => this.setRawRoleById(id, content));
        }

        addSetRoleToQuery(id, content, query) {
            query = query || {$set: {}};
            id = id || this.getNewRoleId(content.ProjectName);
            query.$set[`roles.${id}`] = content;

            return query;
        }

        getRoleActionIdById(roleId) {
            return this.getRoleById(roleId)
                .then(role => utils.xml.actionId(role.SourceCode));
        }

        getRoleIds() {
            return this.getRawProject()
                .then(project => Object.keys(project.roles || {}));
        }

        getRoleIdsFor(names) {
            return this.getRawProject()
                .then(project => {
                    let remainingIds = Object.keys(project.roles);
                    let ids = names.map(name => {
                        let id = null;
                        for (let i = remainingIds.length; i--;) {
                            id = remainingIds[i];
                            if (project.roles[id].ProjectName === name) {
                                remainingIds.splice(i, 1);
                                return id;
                            }
                        }
                        return null;
                    });
                    return ids;
                });
        }

        getRoleId(name) {
            return this.getRoleIdsFor([name])
                .then(ids => ids[0]);
        }

        setRole(name, content) {
            this._logger.trace(`updating role: ${name} in ${this.owner}/${this.name}`);
            content.ProjectName = name;

            this.addRoleMetadata(content);
            return storeRoleBlob(content)
                .then(content => this.setRawRole(name, content));
        }

        // Parse additional important fields
        addRoleMetadata(content) {
            content.Thumbnail = utils.xml.thumbnail(content.SourceCode);
            content.Notes = utils.xml.notes(content.SourceCode);
            content.Updated = new Date();
            return content;
        }

        setRoles(roles) {
            if (this.isDeleted()) return Promise.reject('cannot call setRoles: project has been deleted!');
            if (!roles.length) return Q();

            const query = {$set: {}};
            let rawRoles = null;
            return Q.all(roles.map(role => storeRoleBlob(role)))
                .then(roles => {
                    if (this.isDeleted()) return;
                    rawRoles = roles;
                    const names = rawRoles.map(role => role.ProjectName);
                    this._logger.trace(`updating roles: ${names.join(',')} in ${this.owner}/${this.name}`);
                    return this.getRoleIdsFor(names);
                })
                .then(ids => {
                    if (this.isDeleted()) throw new Error('cannot complete setRoles: project has been deleted!');
                    rawRoles.forEach((role, i) => this.addSetRoleToQuery(ids[i], role, query));
                    return this._execUpdate(query);
                });
        }

        getRawRoleById(id) {
            return this.getRawProject()
                .then(project => {
                    const role = project.roles[id];
                    role.ID = id;
                    return role;
                });
        }

        getRawRole(name) {
            return this.getRawRoles()
                .then(roles => roles.find(role => role.ProjectName === name));
        }

        getRoleById(role) {
            return this.getRawRoleById(role)
                .then(content => content && loadRoleContent(content));
        }

        getRole(role) {
            return this.getRawRole(role)
                .then(content => content && loadRoleContent(content));
        }

        getRawRoles() {
            return this.getRawProject()
                .then(project => {
                    return Object.keys(project.roles)
                        .map(id => {
                            project.roles[id].ID = id;
                            return project.roles[id];
                        });
                });
        }

        getRoles() {
            return this.getRawRoles()
                .then(roles => Q.all(roles.map(loadRoleContent)));
        }

        getCopyFor(user) {
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

        getCopy() {
            return this.getRawProject()
                .then(metadata => {
                    metadata.originTime = Date.now();
                    metadata.collaborators = [];
                    metadata.transient = true;

                    const project = new Project({
                        logger: this._logger,
                        db: this._db,
                        data: metadata
                    });
                    return project.create(metadata.roles);
                });
        }

        getNewRoleName(basename) {
            basename = basename || 'role';
            return this.getRoleNames()
                .then(names => {
                    let i = 2;
                    let name = basename;
                    while (names.includes(name)) {
                        name = `${basename} (${i})`;
                        i++;
                    }
                    return name;
                });
        }

        cloneRole(role, newName) {
            let getNewName = null;

            if (!newName) {
                getNewName = this.getNewRoleName(role);
            } else {
                getNewName = Q(newName);
            }

            return this.getRawRole(role)
                .then(content => {
                    return getNewName
                        .then(newName => this.setRawRole(newName, content));
                });
        }

        removeRoleById(roleId) {
            if (this.isDeleted()) return Promise.reject('cannot removeRole: project has been deleted!');
            const query = {$unset: {}};
            this._logger.trace(`removing role ${roleId} from ${this._id.toString()}`);
            query.$unset[`roles.${roleId}`] = '';
            return this._execUpdate(query);
        }

        removeRole(roleName) {
            if (this.isDeleted()) return Promise.reject('cannot removeRole: project has been deleted!');
            this._logger.trace(`removing role: ${roleName}`);
            return this.getRoleId(roleName)
                .then(roleId => {
                    if (!roleId) return Promise.reject(`Could not find role named ${roleName} in ${this.uuid()}`);
                    return this.removeRoleById(roleId);
                });
        }

        renameRole(role, newName) {
            if (this.isDeleted()) return Promise.reject('cannot renameRole: project has been deleted!');
            return this.getRoleId(role)
                .then(id => this.setRoleName(id, newName));
        }

        setRoleName(roleId, name) {
            if (this.isDeleted()) return Promise.reject('cannot setRoleName: project has been deleted!');
            const query = {$set: {}};
            query.$set[`roles.${roleId}.ProjectName`] = name;

            this._logger.trace(`setting role name of ${roleId} to ${name}`);
            return this._execUpdate(query);
        }

        getRoleName (id) {
            return this.getRawRoleById(id)
                .then(data => data && data.ProjectName);
        }

        getRoleNames () {
            return this.getRawProject()
                .then(project => Object.keys(project.roles).map(id => project.roles[id].ProjectName));
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
                            `${socket.role} in ${this.owner}/${this.name}: ${err}`);
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
                        lastUpdatedAt: new Date(),
                        originTime: this.originTime,
                        collaborators: this.collaborators,
                        roles: roleDict
                    };

                    roles.forEach(role => roleDict[role.ProjectName] = role);
                    return this._db.save(data);
                })
                .then(result => {
                    const id = result.ops[0]._id;
                    this._id = id;
                })
                .then(() => this);
        }

        getLastUpdatedRoleName() {
            return this.getRawRoles()
                .then(roles => utils.sortByDateField(roles, 'Updated', -1).shift().ProjectName);
        }

        getLastUpdatedRole() {
            return this.getLastUpdatedRoleName().then(name => this.getRole(name));
        }

        persist() {
            if (this.isDeleted()) return Promise.reject('cannot call persist: project has been deleted!');
            const query = {$set: {transient: false}};
            this._logger.trace(`persisting project ${this.owner}/${this.name}`);
            return this._execUpdate(query);
        }

        unpersist() {
            if (this.isDeleted()) return Promise.reject('cannot call unpersist: project has been deleted!');
            const query = {$set: {transient: true}};
            this._logger.trace(`unpersisting project ${this.owner}/${this.name}`);
            return this._execUpdate(query);
        }

        archive() {  // Archive a copy of the current project
            return this.getRawProject()
                .then(project => {
                    project.projectId = project._id;
                    delete project._id;
                    return ProjectArchives.save(project);
                })
                .then(result => {
                    return result.ops[0]._id;
                });
        }

        isTransient() {
            return this.getRawProject()
                .then(project => !!project.transient);
        }

        setPublic(isPublic) {
            if (this.isDeleted()) return Promise.reject('cannot call setPublic: project has been deleted!');
            const query = {$set: {Public: isPublic === true}};
            return this._execUpdate(query);
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
                .then(() => this._execUpdate(query))
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
            return this._execUpdate(query);
        }

        _execUpdate(query/*, options*/) {
            query.$set = query.$set || {};
            query.$set.lastUpdatedAt = new Date();

            const args = Array.prototype.slice.call(arguments);
            args.unshift(this.getStorageId());

            return Q(this._db.update.apply(this._db, args))
                .then(res => {
                    const {result} = res;
                    // The project is always referencing the updated version
                    // (even after upsert/"save as")
                    if (result.upserted && result.upserted[0]) {
                        this._id = result.upserted[0]._id;
                    }
                    return res;
                });
        }

        getStorageId() {
            return {
                _id: this._id
            };
        }

        //////////////// Recording messages (network traces) ////////////////
        getRecordStartTimes() {
            return this.getRawProject()
                .then(project => project.recordMessagesAfter || []);
        }

        getLatestRecordStartTime() {
            return this.getRecordStartTimes()
                .then(records => Math.max.apply(null, records.map(record => record.time)));
        }

        isRecordingMessages() {
            return this.getLatestRecordStartTime()
                .then(time => (Date.now() - time) < MAX_MSG_RECORD_DURATION);
        }

        startRecordingMessages(id, time=Date.now()) {  // Set (and return) the start recording time
            const query = {$push: {recordMessagesAfter: {id: id, time: time}}};
            return this._execUpdate(query)
                .then(() => time);
        }

        stopRecordingMessages(id) {
            return this.getRecordStartTimes()
                .then(records => {
                    const minTime = Date.now() - MAX_MSG_RECORD_DURATION;
                    let removed = null;

                    // Remove one matching element from the list and
                    // all that are below the minimum
                    records = records.filter(record => {
                        if (!removed && record.id === id) {
                            removed = record;
                            return false;
                        }
                        return record.time > minTime;
                    });

                    const query = {$set: {recordMessagesAfter: records}};
                    return this._execUpdate(query)
                        .then(() => removed && removed.time);
                });
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
        ProjectArchives;

    ProjectStorage.init = function (_logger, db) {
        logger = _logger.fork('projects');
        collection = db.collection('projects');
        ProjectArchives = db.collection('project-archives');
    };

    ProjectStorage.getRawProject = function (username, projectName) {
        return Q(collection.findOne({owner: username, name: projectName}));
    };

    ProjectStorage.getProjectId = function(owner, name) {
        return ProjectStorage.getRawProject(owner, name)
            .then(project => project && project._id);
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

    ProjectStorage.getById = function (id) {
        return ProjectStorage.getRawProjectById(id)
            .then(data => {
                var params = {
                    logger: logger,
                    db: collection,
                    data
                };
                return data ? new Project(params) : null;
            });
    };

    ProjectStorage.getRawProjectById = function (id) {
        try {
            id = typeof id === 'string' ? ObjectId(id) : id;
            return Q(collection.findOne({_id: id}));
        } catch (e) {
            return Q(null);
        }
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
            collaborators: room.getCollaborators(),
            roles: {}
        };
    };

    ProjectStorage.new = function() {
        if (arguments.length === 2) {
            return ProjectStorage.newFromRoom.apply(this, arguments);
        } else {
            return ProjectStorage.newFromData.apply(this, arguments);
        }
    };

    ProjectStorage.newFromRoom = function(user, room) {
        const project = new Project({
            logger: logger,
            db: collection,
            data: getDefaultProjectData(user, room),
            room: room
        });

        return project.create();
    };

    ProjectStorage.newFromData = function(data) {
        data.roles = data.roles || {};
        data.originTime = data.originTime || new Date();
        data.collaborators = data.collaborators || [];
        data.name = data.name || 'untitled';

        const project = new Project({
            logger: logger,
            db: collection,
            data: data
        });

        return project.create();
    };

})(exports);

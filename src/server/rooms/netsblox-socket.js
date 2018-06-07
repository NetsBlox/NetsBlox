/*
 * This is a socket for NetsBlox that wraps a standard WebSocket
 */
'use strict';
var counter = 0,
    Q = require('q'),
    Constants = require(__dirname + '/../../common/constants'),
    PROJECT_FIELDS = [
        'ProjectName',
        'SourceCode',
        'Media',
        'SourceSize',
        'MediaSize',
        'RoomUuid'
    ],
    R = require('ramda'),
    Utils = require('../server-utils'),
    assert = require('assert'),
    UserActions = require('../storage/user-actions'),
    RoomManager = require('./room-manager'),
    SILENT_MSGS = [
        'pong'
    ],
    CONDENSED_MSGS = [
        'project-response',
        'import-room',
        'record-action',
        'user-action'
    ],
    PUBLIC_ROLE_FORMAT = /^.*@.*@.*$/,
    SERVER_NAME = process.env.SERVER_NAME || 'netsblox';

const Messages = require('../storage/messages');
const ProjectActions = require('../storage/project-actions');
const REQUEST_TIMEOUT = 10*60*1000;  // 10 minutes
const HEARTBEAT_INTERVAL = 25*1000;  // 25 seconds
const BugReporter = require('../bug-reporter');

var createSaveableProject = function(json) {
    var project = R.pick(PROJECT_FIELDS, json);
    // Set defaults
    project.Public = false;
    project.Updated = new Date();

    // Add the thumbnail,notes from the project content
    project.Thumbnail = Utils.xml.thumbnail(project.SourceCode);
    project.Notes = Utils.xml.notes(project.SourceCode);
    return project;
};

class NetsBloxSocket {
    constructor (logger, socket) {
        this.id = (++counter);
        this._logger = logger.fork(this.uuid);

        this.role = null;
        this._room = null;
        this._onRoomJoinDeferred = null;
        this.loggedIn = false;

        this.user = null;
        this.username = this.uuid;
        this._socket = socket;
        this._projectRequests = {};  // saving
        this.lastSocketActivity = Date.now();
        this.nextHeartbeat = null;
        this.nextHeartbeatCheck = null;

        this.onclose = [];
        this._initialize();

        this._logger.trace('created');
    }

    hasRoom (silent) {
        if (!this._room && !silent) {
            this._logger.error('user has no room!');
        }
        return !!this._room;
    }

    getRoom () {
        if (!this.hasRoom()) {
            if (!this._onRoomJoinDeferred) {
                this._onRoomJoinDeferred = Q.defer();
            }
            return this._onRoomJoinDeferred.promise;
        } else {
            return Q(this._room);
        }
    }

    getRawRoom () {
        return this._room;
    }

    updateRoom (isOwner) {
        const room = this._room;
        if (!room) return;

        isOwner = isOwner || this.isOwner();
        if (isOwner) {
            if (Utils.isSocketUuid(room.owner)) {
                room.setOwner(this.username);
            }

            // Update the user's room name
            room.update();
        }

        const sockets = room.getSocketsAt(this.role) || [];
        if (sockets.includes(this)) {
            room.updateRole(this.role);
        }
    }

    _setRoom (room) {
        if (this._room && room !== this._room) {  // leave current room
            this.leave();
        }

        this._room = room;
        this.updateRoom();
        if (this._onRoomJoinDeferred) {
            this._onRoomJoinDeferred.resolve(room);
            this._onRoomJoinDeferred = null;
        }
    }

    isOwner () {
        return this._room &&
            (this._room.owner === this.uuid || this._room.owner === this.username);
    }

    isCollaborator () {
        return this._room && this._room.getCollaborators().includes(this.username);
    }

    canEditRoom () {
        return this.isOwner() || this.isCollaborator();
    }

    sendEditMsg (msg) {
        if (!this.hasRoom()) {
            this._logger.error(`Trying to send edit msg w/o room ${this.uuid}`);
            return;
        }

        // accept the event here and broadcast to everyone
        let projectId = this._room.getProjectId();
        let room = this._room;
        let role = this.role;
        return this.canApplyAction(msg.action)
            .then(canApply => {
                const sockets = this._room.getSocketsAt(role);
                if (canApply) {
                    if (sockets.length > 1) {
                        sockets.forEach(socket => socket.send(msg));
                    }
                    msg.projectId = projectId;
                    // Only set the role's action id if not user action
                    const storeAction = () => room.getProject().getRoleId(role)
                        .then(roleId => {
                            msg.roleId = roleId;
                            return ProjectActions.store(msg);
                        });

                    if (!msg.action.isUserAction) {
                        return room.setRoleActionId(role, msg.action.id)
                            .then(storeAction);
                    } else {
                        return storeAction();
                    }
                }
            });
    }

    canApplyAction(action) {
        const startRole = this.role;
        return this._room.getRoleActionId(this.role)
            .then(actionId => {
                const accepted = actionId < action.id && this.role === startRole;
                if (!accepted) {
                    this._logger.log(`rejecting action with id ${action.id} ` +
                        `(${actionId}) from ${this.getPublicId()}`);
                }
                return accepted;
            });
    }

    _initialize () {
        this._socket.on('message', data => {
            try {
                var msg = JSON.parse(data);
                return this.onMessage(msg);
            } catch (err) {
                this._logger.error(`failed to parse message: ${err} (${data})`);
                BugReporter.reportInvalidSocketMessage(err, data, this);
            }
        });

        this._socket.on('close', () => this.close());

        // change the heartbeat to use ping/pong from the ws spec
        this.keepAlive();
        this.checkAlive();

        // Report the server version
        this.send({
            type: 'report-version',
            body: Utils.version
        });
    }

    close () {
        this._logger.trace(`closed socket for ${this.uuid} (${this.username})`);
        if (this._room) {
            this.leave();
        }
        if (this.nextHeartbeat) {
            clearTimeout(this.nextHeartbeat);
        }
        if (this.nextHeartbeatCheck) {
            clearTimeout(this.nextHeartbeatCheck);
        }
        this.onclose.forEach(fn => fn.call(this));
        this.onClose(this);
    }

    onMessage (msg) {
        let type = msg.type,
            result = Q();

        if (CONDENSED_MSGS.includes(type)) {
            this._logger.trace(`received "${type}" message from ${this.username} (${this.uuid})`);
        } else if (!SILENT_MSGS.includes(type)) {
            let data = JSON.stringify(msg);
            this._logger.trace(`received "${data}" message from ${this.username} (${this.uuid})`);
        }

        this.lastSocketActivity = Date.now();
        if (NetsBloxSocket.MessageHandlers[type]) {
            result = NetsBloxSocket.MessageHandlers[type].call(this, msg) || Q();
        } else {
            this._logger.warn('message "' + JSON.stringify(msg) + '" not recognized');
        }
        return result.catch(err =>
            this._logger.error(`${JSON.stringify(msg)} threw exception ${err}`));
    }

    checkAlive() {
        const sinceLastMsg = Date.now() - this.lastSocketActivity;
        if (sinceLastMsg > 2*NetsBloxSocket.HEARTBEAT_INTERVAL || this.isSocketDead()) {
            this._socket.terminate();
            this.close();
        } else {
            if (this.nextHeartbeatCheck) {
                clearTimeout(this.nextHeartbeatCheck);
            }
            this.nextHeartbeatCheck = setTimeout(this.checkAlive.bind(this), NetsBloxSocket.HEARTBEAT_INTERVAL);
        }
    }

    keepAlive() {
        let sinceLastMsg = Date.now() - this.lastSocketActivity;
        if (sinceLastMsg >= NetsBloxSocket.HEARTBEAT_INTERVAL) {
            this.ping();
            sinceLastMsg = 0;
        }

        const nextMsgDelay = NetsBloxSocket.HEARTBEAT_INTERVAL - sinceLastMsg;
        this.nextHeartbeat = setTimeout(this.keepAlive.bind(this), nextMsgDelay);
    }

    ping() {
        this.send({type: 'ping'}, true);
    }

    isSocketOpen() {
        return this._socket.readyState === this.OPEN;
    }

    isSocketDead() {
        return this._socket.readyState > this.OPEN;
    }

    onLogin (user) {
        let isOwner = this.isOwner();

        this._logger.log(`logged in as ${user.username} (from ${this.username})`);
        // Update the room if we are the owner (and not already logged in)
        this.username = user.username;
        this.user = user;
        this.loggedIn = true;

        this.updateRoom(isOwner);
    }

    onLogout () {
        let isOwner = this.isOwner();

        this._logger.log(`${this.username} is logging out!`);
        this.username = this.uuid;
        this.user = null;
        this.loggedIn = false;

        this.updateRoom(isOwner);
    }

    join (room, role) {
        role = role || this.role;
        this._logger.log(`joining ${room.uuid}/${role} from ${this.role}`);
        if (this._room === room && role !== this.role) {
            return this.moveToRole(role);
        }

        this._logger.log(`joining ${room.uuid}/${role} from ${this.role}`);
        if (this._room && this._room.uuid !== room.uuid) {
            this.leave();
        }

        this._setRoom(room);

        this._room.add(this, role);
        this._logger.trace(`${this.username} joined ${room.uuid} at ${role}`);
        this.role = role;
    }

    getNewName (name, taken) {
        var promise;

        if (this.user) {
            promise = this.user.getNewName(name, taken);
        } else {
            promise = Q('untitled');
        }

        return promise.then(name => {
            this._logger.info(`generated unique name for ${this.username} - ${name}`);
            return name;
        });
    }

    newRoom (opts) {
        opts = opts || {role: 'myRole'};
        opts.role = opts.role || 'myRole';
        return this.getNewName(opts.room || opts.name)
            .then(name => {
                let room = null;
                this._logger.info(`"${this.username}" is making a new room "${name}"`);

                return RoomManager.createRoom(this, name)
                    .then(_room => {
                        room = _room;
                        this._setRoom(room);
                        return room.createRole(opts.role);
                    })
                    .then(() => {
                        return this.join(room, opts.role);
                    })
                    .catch(err => this._logger.error(err));
            });
    }

    // This should only be called internally *EXCEPT* when the socket is going to close
    leave () {
        if (this._room) {
            this._room.remove(this);
        }
    }

    moveToRole (role) {
        this._logger.log(`changing to role ${this._room.uuid}/${role} from ${this.role}`);
        this._room.add(this, role);
        assert.equal(this.role, role);
    }

    sendToOthers (msg) {
        return this._room.sendFrom(this, msg);
    }

    sendToEveryone (msg) {
        return this._room.sendToEveryone(msg);
    }

    send (msg, silent) {
        // Set the defaults
        msg.type = msg.type || 'message';
        if (msg.type === 'message') {
            msg.dstId = msg.dstId || Constants.EVERYONE;
        }

        msg = JSON.stringify(msg);
        if (!silent) {
            this._logger.trace(`Sending message to ${this.uuid} "${msg}"`);
        }

        if (this.isSocketOpen()) {
            this._socket.send(msg);
        } else if (this.isSocketDead()) {
            this.checkAlive();
        } else {
            this._logger.log('could not send msg - socket still opening');
        }
    }

    getState () {
        return this._socket.readyState;
    }

    getProjectJson () {
        var id = ++counter;
        const deferred = Q.defer();
        this.send({
            type: 'project-request',
            id: id
        });
        this._projectRequests[id] = {
            promise: deferred,
            role: this.role,
            roomName: this._room && this._room.name
        };

        // Add the timeout for the project request
        setTimeout(() => {
            if (this._projectRequests[id]) {
                this._projectRequests[id].promise.reject('TIMEOUT');
                delete this._projectRequests[id];
            }
        }, REQUEST_TIMEOUT);

        return deferred.promise;
    }

    getPublicId () {
        let room = this.getRawRoom();
        let publicRoleId = null;
        if (room) {
            publicRoleId = `${this.role}@${room.name}@${room.owner}`;
        }
        return publicRoleId;
    }

    sendMessageTo (msg, dstId) {
        dstId = dstId + ''; // make sure dstId is string
        dstId = dstId.replace(/^\s*/, '').replace(/\s*$/, '');
        msg.dstId = dstId;
        let srcRoom = this._room;
        if (!srcRoom) return this._logger.error(`Sending message without room! ${this.username}`);

        msg.srcProjectId = srcRoom.getProjectId();
        if (PUBLIC_ROLE_FORMAT.test(dstId)) {  // inter-room message
            // Look up the socket matching
            //
            //     <role>@<project>@<owner> or <project>@<owner>
            //
            var idChunks = dstId.split('@'),
                sockets = [],
                ownerId = idChunks.pop(),
                roomName = idChunks.pop(),
                roleId = idChunks.pop();

            const room = RoomManager.getExistingRoom(ownerId, roomName);

            if (room) {
                if (roleId) {
                    if (room.hasRole(roleId)) {
                        sockets = sockets.concat(room.getSocketsAt(roleId));
                    }
                } else {
                    sockets = room.sockets();
                }

                sockets.forEach(socket => {
                    msg.dstId = Constants.EVERYONE;
                    socket.send(msg);
                });

                // record message (including successful delivery)
                msg.dstId = dstId;
                msg.recipients = sockets.map(socket => socket.getPublicId());
            }
        } else {
            if (dstId === 'others in room') {
                msg.recipients = this.sendToOthers(msg);
            } else if (dstId === Constants.EVERYONE) {
                msg.recipients = this.sendToEveryone(msg);
            } else if (srcRoom.hasRole(dstId)) {
                let sockets = srcRoom.getSocketsAt(dstId);
                sockets.forEach(socket => socket.send(msg));
                msg.recipients = sockets.map(socket => socket.getPublicId());
            }
        }

        return this.saveMessage(msg, srcRoom);
    }

    saveMessage (msg, srcRoom/*, dstRoom*/) {
        // Check if the room should save the message
        const project = srcRoom.getProject();
        if (project) {
            return project.isRecordingMessages()
                .then(isRecording => isRecording && Messages.save(msg));
        } else {
            this._logger.error(`Will not save messages: active room is missing project ${srcRoom.getUuid()}`);
        }
    }

    requestActionsAfter (actionId) {
        if (!this.hasRoom()) {
            this._logger.error(`User requested actions without room: ${this.username}`);
            return;
        }

        let project = this._room.getProject();
        let projectId = project.getId();
        return project.getRoleId(this.role)
            .then(roleId => ProjectActions.getActionsAfter(projectId, roleId, actionId))
            .then(actions => {
                actions.forEach(action => this.send(action));
                this.send({type: 'request-actions-complete'});
            });
    }
}

// From the WebSocket spec
NetsBloxSocket.prototype.CONNECTING = 0;
NetsBloxSocket.prototype.OPEN = 1;
NetsBloxSocket.prototype.CLOSING = 2;
NetsBloxSocket.prototype.CLOSED = 3;

NetsBloxSocket.MessageHandlers = {
    'pong': function() {
    },

    'set-uuid': function(msg) {
        this.uuid = msg.body;
        this.username = this.username || this.uuid;
    },

    'request-uuid': function() {
        this.uuid = '_' + SERVER_NAME + Date.now();
        this.username = this.username || this.uuid;
        // Provide a uuid
        this.send({
            type: 'uuid',
            body: this.uuid
        });
    },

    'message': function(msg) {
        if (!this.hasRoom()) {
            this._logger.error(`Cannot send a message when not in a room! ${this.username} (${this.uuid})`);
            return;
        }

        var dstIds = typeof msg.dstId !== 'object' ? [msg.dstId] : msg.dstId.contents;
        dstIds.forEach(dstId => this.sendMessageTo(msg, dstId));
    },

    'user-action': function(msg) {
        return this.sendEditMsg(msg);
    },

    'project-response': function(msg) {
        var id = msg.id,
            json = msg.project,
            err;

        const project = createSaveableProject(json);
        if (!project) {  // silent failure
            err = `Received falsey project! ${JSON.stringify(project)}`;
            this._logger.error(err);
            this._projectRequests[id].promise.reject(err);
            delete this._projectRequests[id];
            return;
        }

        // Check if the socket has changed locations
        const req = this._projectRequests[id];
        const roomName = this._room && this._room.name;
        const hasMoved = this.role !== req.role || roomName !== req.roomName;
        const oldProject = json.ProjectName !== this.role;
        if (hasMoved || oldProject) {
            err = hasMoved ?
                `socket moved from ${req.role}/${req.roomName} to ${this.role}/${roomName}`:
                `received old project ${json.ProjectName}. expected "${this.role}"`;
            this._logger.log(`project request ${id} canceled: ${err}`);
            req.promise.reject(err);
            delete this._projectRequests[id];
            return;
        }

        this._logger.log(`created saveable project for ${this.role} (${id})`);
        req.promise.resolve(project);
        delete this._projectRequests[id];
    },

    'rename-room': function(msg) {
        if (this.isOwner()) {
            this._room.changeName(msg.name, false, !!msg.inPlace);
        }
    },

    'elevate-permissions': function(msg) {
        if (this.isOwner()) {
            var username = msg.username;
            return this._room.addCollaborator(username);
        }
    },

    'permission-elevation-request': function(msg) {
        this.getRoom()
            .then(room => room.getOwnerSockets())
            .then(sockets => sockets.forEach(socket => socket.send(msg)));
    },

    'rename-role': function(msg) {
        if (this.canEditRoom() && msg.role !== msg.name) {
            this._room.renameRole(msg.role, msg.name);

            const sockets = this._room.getSocketsAt(msg.name);
            sockets.forEach(socket => socket.send(msg));
        }
    },

    'request-room-state': function() {
        if (this.hasRoom()) {
            return this._room.getStateMsg()
                .then(msg => this.send(msg));
        }
    },

    'create-room': function(msg) {
        this.newRoom(msg);
    },

    'join-room': function(msg) {
        const {owner, role, actionId} = msg;
        const name = msg.room;
        let room = null;

        return RoomManager.getRoom(this, owner, name)
            .then(nextRoom => {
                room = nextRoom;
                this._logger.trace(`${this.username} is joining room ${owner}/${name}`);
                if (!room.hasRole(role)) {
                    this._logger.trace(`created role ${role} in ${owner}/${name}`);
                    return room.createRole(role);
                }
            })
            .then(() => room.add(this, role))
            .then(() => this.requestActionsAfter(actionId))
            .catch(err => this._logger.error(`${JSON.stringify(msg)} threw exception ${err}`));

    },

    'add-role': function(msg) {
        if (this.canEditRoom()) {
            this._room.createRole(msg.name, Utils.getEmptyRole(msg.name));
        } else {
            this._logger.warn(`${this.username} cannot edit the room`);
        }
    },

    ///////////// Import/Export /////////////
    'import-room': function(msg) {
        let promise = Q([]);

        if (!this.hasRoom()) {
            this._logger.error(`${this.username} has no associated room`);
            return;
        }

        // change the socket's name to the given name (as long as it isn't colliding)
        if (this.user) {
            promise = this.user.getProjectNames();
        }

        return promise
            .then(names => {
                // create unique name, if needed
                const takenNames = {};
                let i = 2;

                names.forEach(name => takenNames[name] = true);

                let name = msg.name;
                while (takenNames[name]) {
                    name = msg.name + ' (' + i + ')';
                    i++;
                }

                this._logger.trace(`changing room name from ${this._room.name} to ${name}`);
                this._room.update(name);

                // Rename the socket's role
                this._logger.trace(`changing role name from ${this.role} to ${msg.role}`);
                this._room.renameRole(this.role, msg.role);

                // Add all the additional roles
                let roles = Object.keys(msg.roles);
                this._logger.trace(`adding roles: ${roles.join(',')}`);
                roles.forEach(role => this._room.silentCreateRole(role));

                // load the roles into the cache
                roles.forEach(role => this._room.setRole(
                    role,
                    {
                        SourceCode: msg.roles[role].SourceCode,
                        Media: msg.roles[role].Media,
                        MediaSize: msg.roles[role].Media.length,
                        SourceSize: msg.roles[role].SourceCode.length,
                        RoomName: msg.name
                    }
                ));

                this._room.onRolesChanged();
            });
    },

    // Retrieve the json for each project and respond
    'export-room': function(msg) {
        if (this.hasRoom()) {
            this._room.serialize()
                .then(project => {
                    this._logger.trace(`Exporting project for ${this._room.name}` +
                        ` to ${this.username}`);

                    this.send({
                        type: 'export-room',
                        content: project,
                        action: msg.action
                    });
                })
                .catch(() =>
                    this._logger.error(`Could not collect projects from ${this._room.name}`));
        }
    },

    'share-msg-type': function(msg) {
        this.sendToEveryone(msg);
    },

    // message for recording user actions
    'record-action': function(msg) {
        var sessionId = this.uuid + '/' + msg.sessionId,  // unique for the given editing session
            projectId = 'n/a',
            record = {};

        if (this.hasRoom()) {
            projectId = this._room.uuid;
        }

        record.username = this.username === this.uuid ? null : this.username;
        record.sessionId = sessionId;
        record.projectId = projectId;
        record.action = msg.action;

        UserActions.record(record);  // Store action in the database by sessionId
    },

    'request-actions': function(msg) {
        const actionId = msg.actionId;
        return this.requestActionsAfter(actionId);
    }
};

// Utilities for testing
NetsBloxSocket.HEARTBEAT_INTERVAL = HEARTBEAT_INTERVAL;
NetsBloxSocket.setHeartBeatInterval = time => NetsBloxSocket.HEARTBEAT_INTERVAL = time;
NetsBloxSocket.resetHeartBeatInterval = () => NetsBloxSocket.setHeartBeatInterval(HEARTBEAT_INTERVAL);

module.exports = NetsBloxSocket;

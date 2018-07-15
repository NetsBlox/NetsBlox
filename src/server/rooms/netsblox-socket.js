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
    SILENT_MSGS = [
        'pong'
    ],
    CONDENSED_MSGS = [
        'project-response',
        'import-room',
        'record-action',
        'user-action'
    ];

const Messages = require('../storage/messages');
const ProjectActions = require('../storage/project-actions');
const REQUEST_TIMEOUT = 10*60*1000;  // 10 minutes
const HEARTBEAT_INTERVAL = 25*1000;  // 25 seconds
const BugReporter = require('../bug-reporter');
const Projects = require('../storage/projects');
const NetsBloxAddress = require('../netsblox-address');

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
        this.projectId = null;
        this.roleId = null;

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
        const hasRoom = !!this.projectId;
        if (!hasRoom && !silent) {
            this._logger.error('user has no room!');
        }
        return hasRoom;
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

    getRoomSync () {
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
        // Update this to not use the room
        // TODO
        let projectId = this.projectId;
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

    getNewName (name) {
        var promise;

        if (this.user) {
            promise = this.user.getNewName(name);
        } else {
            promise = Q(name);
        }

        return promise.then(name => {
            this._logger.info(`generated unique name for ${this.username} - ${name}`);
            return name;
        });
    }

    onEvicted () {
        this.send({type: 'evicted'});
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
        let room = this.getRoomSync();
        let publicRoleId = null;
        if (room) {
            publicRoleId = `${this.role}@${room.name}@${room.owner}`;
        }
        return publicRoleId;
    }

    sendMessageTo (msg, dstId) {
        return NetsBloxAddress.new(dstId, this.projectId, this.roleId)
            .then(address => {
                const states = address.resolve();
                const clients = states
                    .map(state => {
                        const [projectId, roleId] = state;
                        // FIXME
                        return this.getSocketsAt(projectId, roleId);
                    })
                    .reduce((l1, l2) => l1.concat(l2), []);

                clients.forEach(client => {
                    msg.dstId = Constants.EVERYONE;
                    client.send(msg);
                });

                return address.getPublicIds();
            });
    }

    saveMessage (msg, srcProjectId) {
        // Check if the room should save the message
        return Projects.getById(srcProjectId)
            .then(project => {
                if (project) {
                    return project.isRecordingMessages()
                        .then(isRecording => isRecording && Messages.save(msg));
                } else {
                    this._logger.error(`Will not save messages: unknown project ${srcProjectId}`);
                }
            });
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

    importRoom(roleDict) {
        if (!this.hasRoom()) {
            const errMsg = `${this.username} has no associated room`;
            this._logger.error(errMsg);
            return Promise.reject(new Error(errMsg));
        }

        // change the socket's name to the given name (as long as it isn't colliding)
        // Add all the additional roles
        let roleNames = Object.keys(roleDict);

        this._logger.trace(`adding roles: ${roleNames.join(',')}`);
        roleNames.forEach(name => this._room.silentCreateRole(name));

        // load the roles into the cache
        const roles = roleNames.map(name => {
            const role = roleDict[name];
            role.ProjectName = name;
            return role;
        });

        return this._room.setRoles(roles)
            .then(() => this._room.onRolesChanged())
            .then(() => this._room);
    }

    setState(projectId, roleId, username) {
        this.projectId = projectId && projectId.toString();
        this.roleId = roleId;
        this.username = username || this.uuid;
        this.loggedIn = Utils.isSocketUuid(this.username);
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

    'set-state': function(msg) {
        const {projectId, roleId, username, clientId} = msg.body;
        this.uuid = clientId;

        this.setState(projectId, roleId, username);
    },

    'message': function(msg) {
        if (!this.hasRoom()) {
            this._logger.error(`Cannot send a message when not in a room! ${this.username} (${this.uuid})`);
            return;
        }

        var dstIds = typeof msg.dstId !== 'object' ? [msg.dstId] : msg.dstId.contents;
        return Q.all(dstIds.map(dstId => this.sendMessageTo(msg, dstId)))
            .then(recipients => {
                msg.recipients = recipients.reduce((l1, l2) => l1.concat(l2), []);
                msg.dstId = dstIds;
                return this.saveMessage(msg, this.projectId);
            });
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

    'request-room-state': function() {
        if (this.hasRoom()) {
            return this._room.getStateMsg()
                .then(msg => this.send(msg));
        }
    },

    ///////////// Import/Export /////////////
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
            projectId = this.projectId;
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

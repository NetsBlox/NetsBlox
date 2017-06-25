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
    CONDENSED_MSGS = ['project-response', 'import-room', 'record-action'],
    PUBLIC_ROLE_FORMAT = /^.*@.*@.*$/,
    SERVER_NAME = process.env.SERVER_NAME || 'netsblox';

const REQUEST_TIMEOUT = 10*60*1000;

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

        this.roleId = null;
        this._room = null;
        this._onRoomJoinDeferred = null;
        this.loggedIn = false;

        this.user = null;
        this.username = this.uuid;
        this._socket = socket;
        this._projectRequests = {};  // saving
        this._initialize();

        this.onclose = [];

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

    _setRoom (room) {
        this._room = room;
        if (this._onRoomJoinDeferred) {
            this._onRoomJoinDeferred.resolve(room);
            this._onRoomJoinDeferred = null;
        }
    }

    isOwner () {
        return this._room && this._room.owner === this.username;
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

        const sockets = this._room.getSocketsAt(this.roleId);
        if (sockets.length === 1) {
            this._logger.warn(`Socket incorrectly thinks it is collaborating... ${this.uuid}`);
            return this._room.sendUpdateMsg();
        }

        // send the message to leader if the user is the leader.
        // ow, send it to everyone else
        const isLeader = sockets.indexOf(this) === 0;
        if (isLeader) {
            for (var i = 1; i < sockets.length; i++) {
                sockets[i].send(msg);
            }
        } else {
            sockets[0].send(msg);
        }
    }

    _initialize () {
        this._socket.on('message', data => {
            var msg = JSON.parse(data),
                type = msg.type;

            if (msg.type === 'beat') return;

            this._logger.trace(`received "${CONDENSED_MSGS.indexOf(type) !== -1 ? type : data}" message`);
            if (NetsBloxSocket.MessageHandlers[type]) {
                NetsBloxSocket.MessageHandlers[type].call(this, msg);
            } else {
                this._logger.warn('message "' + data + '" not recognized');
            }
        });

        this._socket.on('close', () => {
            this._logger.trace('closed!');
            if (this._room) {
                this.leave();
            }
            this.onclose.forEach(fn => fn.call(this));
            this.onClose(this.uuid);
        });
    }

    onLogin (user) {
        this._logger.log(`logged in as ${user.username} (from ${this.username})`);
        // Update the room if we are the owner (and not already logged in)
        if (this.isOwner() && Utils.isSocketUuid(this.username)) {
            this._room.setOwner(user.username);
        }
        this.username = user.username;
        this.user = user;
        this.loggedIn = true;

        // Update the user's room name
        const room = this._room;
        if (room) {
            room.update();
            if (room.getSocketsAt(this.roleId).includes(this)) {
                room.updateRole(this.roleId);
            }
        }
    }

    join (room, role) {
        role = role || this.roleId;
        this._logger.log(`joining ${room.uuid}/${role} from ${this.roleId}`);
        if (this._room === room && role !== this.roleId) {
            return this.moveToRole(role);
        }

        this._logger.log(`joining ${room.uuid}/${role} from ${this.roleId}`);
        if (this._room && this._room.uuid !== room.uuid) {
            this.leave();
        }

        this._setRoom(room);

        this._room.add(this, role);
        this._logger.trace(`${this.username} joined ${room.uuid} at ${role}`);
        this.roleId = role;
    }

    getNewName (name, taken) {
        var promise;

        if (this.user) {
            promise = this.user.getNewName(name, taken);
        } else {
            promise = Q('New Room ' + (Date.now() % 100));
        }

        return promise.then(name => {
            this._logger.info(`generated unique name for ${this.username} - ${name}`);
            return name;
        });
    }

    newRoom (opts) {
        opts = opts || {role: 'myRole'};
        return this.getNewName(opts.room || opts.name)
            .then(name => {
                let room = null;
                this._logger.info(`"${this.username}" is making a new room "${name}"`);

                return RoomManager.createRoom(this, name)
                    .then(_room => {
                        room = _room;
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
        this._logger.log(`changing to role ${this._room.uuid}/${role} from ${this.roleId}`);
        this._room.add(this, role);
        assert.equal(this.roleId, role);
    }

    sendToOthers (msg) {
        this._room.sendFrom(this, msg);
    }

    sendToEveryone (msg) {
        this._room.sendToEveryone(msg);
    }

    send (msg) {
        // Set the defaults
        msg.type = msg.type || 'message';
        if (msg.type === 'message') {
            msg.dstId = msg.dstId || Constants.EVERYONE;
        }

        msg = JSON.stringify(msg);
        this._logger.trace(`Sending message to ${this.uuid} "${msg}"`);
        if (this._socket.readyState === this.OPEN) {
            this._socket.send(msg);
        } else {
            this._logger.log('could not send msg - socket no longer open');
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
        this._projectRequests[id] = deferred;

        // Add the timeout for the project request
        setTimeout(() => {
            if (this._projectRequests[id]) {
                this._projectRequests[id].reject('TIMEOUT');
                delete this._projectRequests[id];
            }
        }, REQUEST_TIMEOUT);

        return deferred.promise;
    }

    sendMessageTo (msg, dstId) {
        msg.dstId = dstId;
        if (dstId === 'others in room' || dstId === Constants.EVERYONE ||
            this._room.hasRole(dstId)) {  // local message

            dstId === 'others in room' ? this.sendToOthers(msg) : this.sendToEveryone(msg);
        } else if (PUBLIC_ROLE_FORMAT.test(dstId)) {  // inter-room message
            // Look up the socket matching
            //
            //     <role>@<project>@<owner> or <project>@<owner>
            //
            var idChunks = dstId.split('@'),
                sockets = [],
                ownerId = idChunks.pop(),
                roomName = idChunks.pop(),
                roleId = idChunks.pop(),
                roomId = Utils.uuid(ownerId, roomName),
                room = RoomManager.rooms[roomId];

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
            }
        }
    }
}

// From the WebSocket spec
NetsBloxSocket.prototype.CONNECTING = 0;
NetsBloxSocket.prototype.OPEN = 1;
NetsBloxSocket.prototype.CLOSING = 2;
NetsBloxSocket.prototype.CLOSED = 3;

NetsBloxSocket.MessageHandlers = {
    'beat': function() {},

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
            json = msg.project;

        const project = createSaveableProject(json);
        if (!project) {  // silent failure
            var err = `Received falsey project! ${JSON.stringify(project)}`;
            this._logger.error(err);
            this._projectRequests[id].reject(err);
            delete this._projectRequests[id];
            return;
        }

        this._logger.log('created saveable project for request ' + id);
        this._projectRequests[id].resolve(project);
        delete this._projectRequests[id];
    },

    'rename-room': function(msg) {
        if (this.isOwner()) {
            this._room.update(msg.name);
        }
    },

    'elevate-permissions': function(msg) {
        if (this.isOwner()) {
            var username = msg.username;
            this._room.addCollaborator(username);
            this._room.save();
        }
    },

    'permission-elevation-request': function(msg) {
        this.getRoom()
            .then(room => room.getOwnerSockets())
            .then(sockets => sockets.forEach(socket => socket.send(msg)));
    },

    'rename-role': function(msg) {
        if (this.canEditRoom() && msg.roleId !== msg.name) {
            this._room.renameRole(msg.roleId, msg.name);

            const sockets = this._room.getSocketsAt(msg.name);
            sockets.forEach(socket => socket.send(msg));
        }
    },

    'request-room-state': function() {
        if (this.hasRoom()) {
            var msg = this._room.getStateMsg();
            this.send(msg);
        }
    },

    'create-room': function(msg) {
        this.newRoom(msg);
    },

    'join-room': function(msg) {
        var owner = msg.owner,
            name = msg.room,
            role = msg.role;

        return RoomManager.getRoom(this, owner, name)
            .then(room => {
                this._logger.trace(`${this.username} is joining room ${owner}/${name}`);

                // Check if the user is already at the room
                return room.add(this, role);
            });
        
    },

    'add-role': function(msg) {
        if (this.isOwner()) {
            this._room.createRole(msg.name, Utils.getEmptyRole(msg.name));
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
                this._logger.trace(`changing role name from ${this.roleId} to ${msg.role}`);
                this._room.renameRole(this.roleId, msg.role);

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

    'request-new-name': function() {
        if (this.hasRoom()) {
            this._room.name = null;
            this._room.changeName();  // get unique base name
        } else {
            this._logger.warn(`Cannot req new name w/o a room! (${this.username})`);
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
    }
};

module.exports = NetsBloxSocket;

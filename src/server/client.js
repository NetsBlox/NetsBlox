/*
 * This is a socket for NetsBlox that wraps a standard WebSocket
 */
'use strict';
var counter = 0,
    Q = require('q'),
    Constants = require(__dirname + '/../common/constants'),
    Utils = require('./server-utils'),
    UserActions = require('./storage/user-actions'),
    SILENT_MSGS = [
        'pong'
    ],
    CONDENSED_MSGS = [
        'project-response',
        'import-room',
        'record-action',
        'user-action'
    ];

const Messages = require('./storage/messages');
const ProjectActions = require('./storage/project-actions');
const REQUEST_TIMEOUT = 60*1000;  // 1 minute
const HEARTBEAT_INTERVAL = 25*1000;  // 25 seconds
const BugReporter = require('./bug-reporter');
const Projects = require('./storage/projects');
const NetsBloxAddress = require('./netsblox-address');
const NetworkTopology = require('./network-topology');

class Client {
    constructor (logger, socket) {
        this.id = (++counter);
        this._logger = logger.fork('client-'+this.id);

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

    hasProject (silent) {
        const hasProject = !!this.projectId;
        if (!hasProject && !silent) {
            this._logger.error('user has no project!');
        }
        return hasProject;
    }

    isOwner () {  // TODO: move to auth stuff...
        // TODO: update
        return this.projectId;
    }

    sendEditMsg (msg) {
        if (!this.hasProject()) {
            this._logger.error(`Trying to send edit msg w/o project ${this.uuid}`);
            return;
        }

        // accept the event here and broadcast to everyone
        const projectId = this.projectId;
        const roleId = this.roleId;
        return this.canApplyAction(msg.action)
            .then(canApply => {
                const sockets = NetworkTopology.getSocketsAt(projectId, roleId);
                if (canApply) {
                    if (sockets.length > 1) {
                        sockets.forEach(socket => socket.send(msg));
                    }
                    msg.projectId = projectId;
                    // Only set the role's action id if not user action
                    msg.roleId = roleId;

                    if (!msg.action.isUserAction) {
                        return ProjectActions.setLatestActionId(projectId, roleId, msg.action.id)
                            .then(() => ProjectActions.store(msg));
                    } else {
                        return ProjectActions.store(msg);
                    }
                } else {
                    msg.type = 'action-rejected';
                    this.send(msg);
                }
            });
    }

    async canApplyAction(action) {
        const startRole = this.roleId;
        const actionId = await ProjectActions.getLatestActionId(this.projectId, this.roleId);

        const accepted = actionId < action.id && this.roleId === startRole;
        if (!accepted) {
            const prettyId = `${this.uuid} at ${this.roleId} in ${this.projectId}`;
            this._logger.log(`rejecting action with id ${action.id} ` +
                `(${actionId}) from ${prettyId}`);
        }
        return accepted;
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
        if (this.nextHeartbeat) {
            clearTimeout(this.nextHeartbeat);
        }
        if (this.nextHeartbeatCheck) {
            clearTimeout(this.nextHeartbeatCheck);
        }
        this.onclose.forEach(fn => fn.call(this));
        this.onclose = [];  // ensure no double-calling of close
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
        if (Client.MessageHandlers[type]) {
            result = Client.MessageHandlers[type].call(this, msg) || Q();
        } else {
            this._logger.warn('message "' + JSON.stringify(msg) + '" not recognized');
        }
        return result.catch(err =>
            this._logger.error(`${JSON.stringify(msg)} threw exception ${err}`));
    }

    checkAlive() {
        const sinceLastMsg = Date.now() - this.lastSocketActivity;
        if (sinceLastMsg > 2*Client.HEARTBEAT_INTERVAL || this.isSocketDead()) {
            this._socket.terminate();
            this.close();
        } else {
            if (this.nextHeartbeatCheck) {
                clearTimeout(this.nextHeartbeatCheck);
            }
            this.nextHeartbeatCheck = setTimeout(this.checkAlive.bind(this), Client.HEARTBEAT_INTERVAL);
        }
    }

    keepAlive() {
        let sinceLastMsg = Date.now() - this.lastSocketActivity;
        if (sinceLastMsg >= Client.HEARTBEAT_INTERVAL) {
            this.ping();
            sinceLastMsg = 0;
        }

        const nextMsgDelay = Client.HEARTBEAT_INTERVAL - sinceLastMsg;
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

    onLogout () {
        this._logger.log(`${this.username} is logging out!`);
        this.username = this.uuid;
        this.user = null;
        this.loggedIn = false;
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

    sendToEveryone (msg) {
        const sockets = NetworkTopology.getSocketsAtProject(this.projectId);
        sockets.forEach(socket => socket.send(msg));
    }

    sendMessage (msgType, content) {
        const msg = {
            msgType,
            content
        };
        return this.send(msg);
    }

    send (msg, silent) {
        // Set the defaults
        msg.type = msg.type || 'message';
        if (msg.type === 'message') {
            msg.dstId = msg.dstId || Constants.EVERYONE;
            msg.content = msg.content || {};
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

    getProjectJson (timeout=REQUEST_TIMEOUT) {
        var id = ++counter;
        const deferred = Q.defer();
        this.send({
            type: 'project-request',
            id: id
        });
        this._projectRequests[id] = {
            promise: deferred,
            roleId: this.roleId,
            projectId: this.projectId
        };

        // Add the timeout for the project request
        setTimeout(() => {
            if (this._projectRequests[id]) {
                this._projectRequests[id].promise.reject('TIMEOUT');
                delete this._projectRequests[id];
            }
        }, timeout);

        return deferred.promise;
    }

    getPublicId () {
        // Look up the current project, role names
        return Projects.getRawProjectById(this.projectId)
            .then(metadata => {
                if (!metadata.roles[this.roleId]) {
                    throw new Error('Role not found');
                }

                const roleName = metadata.roles[this.roleId].ProjectName;
                const projectName = metadata.name;
                const owner = metadata.owner;
                return `${roleName}@${projectName}@${owner}`;
            });
    }

    sendMessageTo (msg, dstId) {
        return NetsBloxAddress.new(dstId, this.projectId, this.roleId)
            .then(address => {
                const states = address.resolve();
                const clients = states
                    .map(state => {
                        const [projectId, roleId] = state;
                        return NetworkTopology.getSocketsAt(projectId, roleId);
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
                    return project.isRecordingMessages(true) // OPT initiates a database query
                        .then(isRecording => isRecording && Messages.save(msg));
                } else {
                    this._logger.error(`Will not save messages: unknown project ${srcProjectId}`);
                }
            });
    }

    requestActionsAfter (actionId) {
        if (!this.projectId) {
            this._logger.error(`User requested actions without project: ${this.username}`);
            this.send({type: 'request-actions-complete'});
            return;
        }

        return ProjectActions.getActionsAfter(this.projectId, this.roleId, actionId)
            .then(actions => {
                actions.forEach(action => this.send(action));
                this.send({type: 'request-actions-complete'});
            });
    }

    setState(projectId, roleId, username) {
        this.projectId = projectId && projectId.toString();
        this.roleId = roleId;
        this.username = username || this.uuid;
        this.loggedIn = Utils.isSocketUuid(this.username);
    }
}

// From the WebSocket spec
Client.prototype.CONNECTING = 0;
Client.prototype.OPEN = 1;
Client.prototype.CLOSING = 2;
Client.prototype.CLOSED = 3;

Client.MessageHandlers = {
    'pong': function() {
    },

    'set-uuid': function(msg) {
        const {clientId} = msg;
        if (this.uuid && this.uuid !== clientId) {
            throw new Error(`client ${this.uuid} tried to reset clientId to ${clientId}`);
        }

        this.uuid = clientId;
        this.username = this.username || clientId;
        this.send({type: 'connected'});
    },

    'message': function(msg) {
        const dstIds = typeof msg.dstId !== 'object' ? [msg.dstId] : msg.dstId.contents;
        return Q.all(dstIds.map(dstId => this.sendMessageTo(msg, dstId)))
            .then(recipients => {
                msg.recipients = recipients.reduce((l1, l2) => l1.concat(l2), []);
                msg.dstId = dstIds;
                msg.srcProjectId = this.projectId;
                return this.saveMessage(msg, this.projectId);
            });
    },

    'user-action': function(msg) {
        return this.sendEditMsg(msg);
    },

    'project-response': function(msg) {
        const id = msg.id;
        const json = msg.project;

        const req = this._projectRequests[id];
        delete this._projectRequests[id];

        const project = {
            ID: req.roleId,
            ProjectName: json.ProjectName,
            SourceCode: json.SourceCode,
            Media: json.Media,
            Thumbnail: Utils.xml.thumbnail(json.SourceCode),
            Notes: Utils.xml.notes(json.SourceCode),
            Updated: new Date()
        };

        if (!project) {  // silent failure
            const err = `Received falsey project! ${JSON.stringify(project)}`;
            this._logger.error(err);
            req.promise.reject(err);
            return;
        }

        // Check if the socket has changed locations

        const {projectId, roleId} = req;
        const hasMoved = projectId !== this.projectId || roleId !== this.roleId;
        if (hasMoved) {
            const err = `socket moved from ${req.roleId}/${req.projectId} ` +
                `to ${this.roleId}/${this.projectId}`;
            this._logger.log(`project request ${id} canceled: ${err}`);
            return req.promise.reject(err);
        }

        this._logger.log(`created saveable project for ${this.roleId} (${id})`);
        return req.promise.resolve(project);
    },

    'elevate-permissions': async function(msg) {
        const {username, projectId} = msg;
        const project = await Projects.getById(projectId);
        if (project.owner === this.username) {
            await project.addCollaborator(username);
            await NetworkTopology.onRoomUpdate(projectId);
        }
    },

    'permission-elevation-request': function(msg) {
        const {projectId} = msg;
        return Projects.getRawProjectById(this.projectId)
            .then(metadata => {
                const {owner} = metadata;
                const sockets = NetworkTopology.getSocketsAtProject(projectId);
                const owners = sockets.filter(socket => socket.username === owner);

                owners.forEach(socket => socket.send(msg));
            });
    },

    'request-room-state': function() {
        if (this.hasProject()) {
            return NetworkTopology.getRoomState(this.projectId)
                .then(msg => {
                    msg.type = 'room-roles';
                    this.send(msg);
                });
        }
    },

    ///////////// Import/Export /////////////
    'export-room': async function(msg) {
        if (this.hasProject()) {
            const projectId = this.projectId;
            const occupantForRole = {};

            // Get the first occupant for each role
            NetworkTopology.getSocketsAtProject(projectId).reverse()
                .forEach(socket => {
                    occupantForRole[socket.roleId] = socket;
                });

            const project = await Projects.getById(this.projectId);
                    // For each role...
                    //   - if it is occupied, request the content
                    //   - else, use the content from the database
            return project.getRoleIds()
                .then(ids => {
                    const fetchers = ids.map(id => {
                        const occupant = occupantForRole[id];
                        if (occupant) {
                            return occupant.getProjectJson()
                                .catch(err => {
                                    this._logger.info(`Failed to retrieve project via ws. Falling back to content from database... (${err.message})`);
                                    return project.getRoleById(id);
                                });
                        }
                        return project.getRoleById(id);
                    });

                    return Q.all(fetchers);
                })
                .then(roles => {
                    const roleContents = roles.map(content =>
                        Utils.xml.format('<role name="@">', content.ProjectName)
                        + content.SourceCode + content.Media + '</role>'
                    );
                    return Utils.xml.format('<room name="@" app="@">', project.name, Utils.APP) +
                        roleContents.join('') + '</room>';
                })
                .then(xml => {
                    this._logger.trace(`Exporting project for ${projectId}` +
                        ` to ${this.username}`);

                    this.send({
                        type: 'export-room',
                        content: xml,
                        action: msg.action
                    });
                })
                .catch(() =>
                    this._logger.error(`Could not collect projects from ${this.projectId}`));
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

        if (this.hasProject()) {
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
Client.HEARTBEAT_INTERVAL = HEARTBEAT_INTERVAL;
Client.setHeartBeatInterval = time => Client.HEARTBEAT_INTERVAL = time;
Client.resetHeartBeatInterval = () => Client.setHeartBeatInterval(HEARTBEAT_INTERVAL);

module.exports = Client;

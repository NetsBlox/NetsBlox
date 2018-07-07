
'use strict';

var Socket = require('./rooms/netsblox-socket');
const utils = require('./server-utils');
const Projects = require('./storage/projects');

var SocketManager = function() {
    this._sockets = [];

    // Provide getter for sockets
    Socket.prototype.onClose = SocketManager.prototype.onClose.bind(this);
    Socket.prototype.getSocketsAt = SocketManager.prototype.getSocketsAt.bind(this);
};

SocketManager.prototype.init = function(logger) {
    this._logger = logger.fork('socket-manager');
};

SocketManager.prototype.enable = function(wss) {
    this._logger.info('Socket management enabled!');

    // Should I move this back to the server?
    // TODO
    wss.on('connection', (rawSocket, req) => {
        rawSocket.upgradeReq = req;
        var socket = new Socket(this._logger, rawSocket);
        this._sockets.push(socket);
    });
};

SocketManager.prototype.getSocket = function(uuid) {
    return this._sockets.find(socket => socket.uuid === uuid);
};

SocketManager.prototype.getSocketsAt = function(projectId, roleId) {
    projectId = projectId && projectId.toString();
    return this._sockets.filter(
        socket => socket.projectId === projectId && socket.roleId === roleId
    );
};

SocketManager.prototype.getSocketsAtProject = function(projectId) {
    projectId = projectId && projectId.toString();
    return this._sockets.filter(socket => socket.projectId === projectId);
};

SocketManager.prototype.setClientState = function(clientId, projectId, roleId, username) {
    const client = this.getSocket(clientId);

    if (!client) {
        this._logger.info(`Could not set client state for ${clientId}`);
        // Reconsider how this might be affected
        // TODO
        //return Promise.reject(new Error(`No websocket connection for ${clientId}`));
        return Promise.resolve();
    }

    // Update the changed rooms
    const oldProjectId = client.projectId;
    client.setState(projectId, roleId, username);

    if (oldProjectId && oldProjectId !== projectId) {
        this.onRoomUpdate(oldProjectId);
    }
    return this.onRoomUpdate(projectId);
};

SocketManager.prototype.getRoomState = function(projectId) {
    return Projects.getRawProjectById(projectId)
        .then(metadata => {
            const ids = Object.keys(metadata.roles).sort();
            const rolesInfo = {};
            const roles = ids.map(id => [metadata.roles[id].ProjectName, id]);

            roles.forEach(pair => {
                // Change this to use the socket id
                const [name, id] = pair;
                const occupants = this.getSocketsAt(projectId, id)
                    .map(socket => {
                        return {
                            uuid: socket.uuid,
                            username: utils.isSocketUuid(socket.username) ?
                                null : socket.username
                        };
                    });
                rolesInfo[id] = {name, occupants};
            });

            return {
                version: Date.now(),
                owner: metadata.owner,
                id: metadata._id.toString(),
                collaborators: metadata.collaborators,
                name: metadata.name,
                roles: rolesInfo
            };
        });
};

SocketManager.prototype.onRoomUpdate = function(projectId) {
    // Send room updates to the clients in the room
    // TODO
    return this.getRoomState(projectId)
        .then(state => {
            const clients = this.getSocketsAtProject(projectId);

            const msg = state;
            msg.type = 'room-roles';

            const count = clients.length;
            this._logger.error(`About to send room update for ${projectId} to ${count} clients`);
            clients.forEach(client => client.send(msg));
            return msg;
        });
};

SocketManager.prototype.sockets = function() {
    return this._sockets.slice();
};

SocketManager.prototype.onClose = function(socket) {
    const index = this._sockets.indexOf(socket);
    const hasSocket = index !== -1;
    if (hasSocket) {
        this._sockets.splice(index, 1);
    } else {
        this._logger.error(`Could not find socket: ${socket.username}`);
    }
    return hasSocket;
};

SocketManager.prototype.socketsFor = function(username) {
    var uuids = Object.keys(this._sockets),
        sockets = [],
        socket;

    for (var i = uuids.length; i--;) {
        socket = this._sockets[uuids[i]];
        if (socket.username === username) {
            sockets.push(socket);
        }
    }
    return sockets;
};

module.exports = new SocketManager();


'use strict';

var Socket = require('./rooms/netsblox-socket');

var SocketManager = function() {
    this._sockets = [];

    // Provide getter for sockets
    Socket.prototype.onClose = SocketManager.prototype.onClose.bind(this);
};

SocketManager.prototype.init = function(logger) {
    this._logger = logger.fork('socket-manager');
};

SocketManager.prototype.enable = function(wss) {
    this._logger.info('Socket management enabled!');

    wss.on('connection', (rawSocket, req) => {
        rawSocket.upgradeReq = req;
        var socket = new Socket(this._logger, rawSocket);
        this._sockets.push(socket);
    });
};

SocketManager.prototype.getSocket = function(uuid) {
    return this._sockets.find(socket => socket.uuid === uuid);
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

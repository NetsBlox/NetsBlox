
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

    wss.on('connection', rawSocket => {
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

SocketManager.prototype.onClose = function(uuid) {
    for (var i = this._sockets.length; i--;) {
        if (this._sockets[i].uuid === uuid) {
            delete this._sockets[uuid];
            return;
        }
    }
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

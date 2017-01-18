
'use strict';

var Socket = require('./rooms/NetsBloxSocket');

var SocketManager = function() {
    this.sockets = {};

    // Provide getter for sockets
    Socket.prototype.onClose = SocketManager.prototype.onClose.bind(this);
};

SocketManager.prototype.init = function(logger) {
    this._logger = logger.fork('SocketManager');
};

SocketManager.prototype.enable = function(wss) {
    this._logger.info('Socket management enabled!');

    wss.on('connection', rawSocket => {
        var socket = new Socket(this._logger, rawSocket);
        this.sockets[socket.uuid] = socket;
    });
};

SocketManager.prototype.onClose = function(uuid) {
    delete this.sockets[uuid];
};

SocketManager.prototype.socketsFor = function(username) {
    var uuids = Object.keys(this.sockets),
        sockets = [],
        socket;

    for (var i = uuids.length; i--;) {
        socket = this.sockets[uuids[i]];
        if (socket.username === username) {
            sockets.push(socket);
        }
    }
    return sockets;
};

module.exports = new SocketManager();

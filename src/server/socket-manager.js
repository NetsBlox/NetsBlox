
'use strict';

var Socket = require('./rooms/netsblox-socket');

var SocketManager = function() {
    this.sockets = {};

    // Provide getter for sockets
    Socket.prototype.onClose = SocketManager.prototype.onClose.bind(this);
};

SocketManager.prototype.init = function(logger) {
    this._logger = logger.fork('socket-manager');
};

SocketManager.prototype.enable = function(wss) {
    this._logger.info('Socket management enabled!');

    wss.on('connection', rawSocket => {
        var url = rawSocket.upgradeReq.url;
        if (url === '/') {
            var socket = new Socket(this._logger, rawSocket);
            this.sockets[socket.uuid] = socket;
        }
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

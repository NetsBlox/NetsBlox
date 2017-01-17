
'use strict';

var WebSocketServer = require('ws').Server,
    Socket = require('./rooms/NetsBloxSocket');

var SocketManager = function() {
    this._wss = null;
    this.sockets = {};

    // Provide getter for sockets
    Socket.prototype.onClose = SocketManager.prototype.onClose.bind(this);
};

SocketManager.prototype.init = function(logger) {
    this._logger = logger.fork('SocketManager');
};

SocketManager.prototype.start = function(options) {
    this._wss = new WebSocketServer(options);
    this._logger.info('WebSocket server started!');

    this._wss.on('connection', rawSocket => {
        var socket = new Socket(this._logger, rawSocket);
        this.sockets[socket.uuid] = socket;
    });
};

SocketManager.prototype.stop = function() {
    this._wss.close();
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

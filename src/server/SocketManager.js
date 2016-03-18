
'use strict';

var WebSocketServer = require('ws').Server,
    RoomManager = require('./rooms/RoomManager'),
    Socket = require('./rooms/NetsBloxSocket'),
    logger;

var SocketManager = function(_logger) {
    logger = _logger.fork('SocketManager');
    this._wss = null;
    this.sockets = {};

    // Provide getter for sockets
    var self = this;
    Socket.prototype.getRoom = function(uuid, name, callback) {
        return self.getRoom(this, uuid, name, callback);
    };
    Socket.prototype.createRoom = RoomManager.prototype.createRoom.bind(this);
    Socket.prototype.checkRoom = RoomManager.prototype.checkRoom.bind(this);
    Socket.prototype.onClose = SocketManager.prototype.onClose.bind(this);
};


/**
 * Start the WebSocket server and start the socket updating interval.
 *
 * @param {Object} opts
 * @return {undefined}
 */
SocketManager.prototype.start = function(options) {
    this._wss = new WebSocketServer(options);
    logger.info('WebSocket server started!');

    this._wss.on('connection', rawSocket => {
        var socket = new Socket(logger, rawSocket);
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

module.exports = SocketManager;

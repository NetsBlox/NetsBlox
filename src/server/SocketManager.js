
'use strict';

var WebSocketServer = require('ws').Server,
    TableManager = require('./groups/TableManager'),
    Socket = require('./groups/NetsBloxSocket'),
    logger;

var SocketManager = function(_logger) {
    logger = _logger.fork('SocketManager');
    this._wss = null;
    this.sockets = {};
    this.tables = new TableManager(logger);

    // Provide getter for sockets
    Socket.prototype.getTable = TableManager.prototype.get.bind(this.tables);
    Socket.prototype.checkTable = TableManager.prototype.checkTable.bind(this.tables);
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

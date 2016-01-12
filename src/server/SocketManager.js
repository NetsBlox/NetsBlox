
'use strict';

var WebSocketServer = require('ws').Server,
    TableManager = require('./groups/TableManager'),
    Socket = require('./groups/NetsBloxSocket');

var SocketManager = function(logger) {
    this._logger = logger.fork('SocketManager');
    this._wss = null;
    this.sockets = {};
    this.tables = new TableManager(this._logger);

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

module.exports = SocketManager;

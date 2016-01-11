/*
 * This is a socket for NetsBlox that wraps a standard WebSocket
 */
'use strict';
var counter = 0;
    
var NetsBloxSocket = function(logger, socket) {
    var id = ++counter;
    this.id = id;
    this.uuid = '_client_'+id;
    this._logger = logger.fork(this.uuid);

    this._seatId = null;
    this._tableId = null;
    this._table = null;

    this.username = this.uuid;
    this._socket = socket;
    this._initialize();

    // Provide a uuid
    socket.send('uuid '+ this.uuid);
    this._logger.trace('created');
};

// From the WebSocket spec
NetsBloxSocket.prototype.CONNECTING = 0;
NetsBloxSocket.prototype.OPEN = 1;
NetsBloxSocket.prototype.CLOSING = 2;
NetsBloxSocket.prototype.CLOSED = 3;

// TODO: Every message should contain the sender and receiver
NetsBloxSocket.MessageHandlers = {
    'message': function(msg, rawMsg) {
        this.sendToTable(rawMsg);
    },
    'save-project': function(msg) {
        // Request the projects from all other peers at the table
        // TODO
        this.sendToTable('project-request ' + this._seatId);

        // Request the projects from all other peers at the table
        // TODO
    },

    'join-table': function(msg) {
        var tableName = msg[0],  // Get the seat
            seat = msg[1],
            table;
        table = this.getTable(tableName, this.username);
        this.join(table, seat);
    }
};

NetsBloxSocket.prototype._initialize = function(msg) {
    this._socket.on('message', data => {
        this._logger.trace('received "' + data+ '"');
        var msg = data.split(' '),
            type = msg.shift();

        if (NetsBloxSocket.MessageHandlers[type]) {
            NetsBloxSocket.MessageHandlers[type].call(this, msg, data);
        } else {
            this._logger.warn('message "' + data + '" not recognized');
        }
    });

    this._socket.on('close', data => {
        this._logger.trace('closed!');
        if (this._table) {
            this._table.remove(this._seatId);
        }
    });
};

NetsBloxSocket.prototype.onLogin = function(username) {
    this._logger.log('logged in as ' + username);
    this.username = username;

    // Update the user's table name
    // TODO

    // Update the user's table name
    // TODO
};

NetsBloxSocket.prototype.join = function(table, seat) {
    this._logger.log(`joining ${table.uuid}/${seat}`);
    if (this._table) {
        this._table.remove(this._seatId);
    }

    this._table = table;
    this._table.add(this, seat);
    this._seatId = seat;
};

NetsBloxSocket.prototype.sendToTable = function(msg) {
    this._table.sendFrom(this._seatId, msg);
};

NetsBloxSocket.prototype.send = function(msg) {
    this._logger.trace(`Sending message to ${this.uuid} "${msg}"`);
    this._socket.send(msg);
};

NetsBloxSocket.prototype.getState = function() {
    return this._socket.readyState;
};

module.exports = NetsBloxSocket;

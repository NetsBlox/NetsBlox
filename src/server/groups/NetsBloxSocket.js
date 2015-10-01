/*
 * This is a socket for NetsBlox that wraps a standard WebSocket
 */
'use strict';
var counter = 0;
var NetsBloxSocket = function(socket) {
    var id = ++counter;
    this.id = id;
    this.uuid = 'user_'+id;
    this._socket = socket;

    // Provide a uuid
    socket.send('uuid '+ this.uuid);
};

NetsBloxSocket.prototype.send = function(msg) {
    console.log('sending:', msg);
    this._socket.send(msg);
};

NetsBloxSocket.prototype.getState = function() {
    return this._socket.readyState;
};

// From the WebSocket spec
NetsBloxSocket.prototype.CONNECTING = 0;
NetsBloxSocket.prototype.OPEN = 1;
NetsBloxSocket.prototype.CLOSING = 2;
NetsBloxSocket.prototype.CLOSED = 3;

module.exports = NetsBloxSocket;

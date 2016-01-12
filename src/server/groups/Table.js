
'use strict';

var R = require('ramda');
var Table = function(logger, uuid, leader) {
    this._logger = logger.fork('Table:' + uuid);

    this.uuid = uuid;
    // TODO: Add the server routing logic
    this.seats = {};
    this.leader = leader;
    this._logger.log('created!');
};

Table.prototype.add = function(socket, seat) {
    // FIXME: verify that the seat exists
    //if (this.seats[seat] !== null) {  // Seat doesn't exist or is occupied
        //this._logger.warn('Cannot add ' + (socket.username || socket.uuid) + ' to ' + seat);
        //return;
    //}

    this.seats[seat] = socket;
    this.onSeatsChanged();  // Update all clients
    // TODO: Shutdown the virtual client
};

Table.prototype.createSeat = function(seat) {
    // TODO
    this.seats[seat] = null;
    this.onSeatsChanged();
};

Table.prototype.removeSeat = function(seat) {
    // TODO
    this.onSeatsChanged();
};

Table.prototype.onSeatsChanged = function() {
    // This should be called when the table layout changes
    // Send the table info to the socket
    var seats = {},
        sockets,
        msg;

    Object.keys(this.seats)
        .forEach(seat => {
            seats[seat] = this.seats[seat] ? this.seats[seat].username : null;
        });

    msg = [
        'table-seats',
        this.uuid,
        JSON.stringify(seats)
    ].join(' ');

    sockets = R.values(this.seats).filter(socket => !!socket);
    sockets.map(socket => socket.send(msg));
};

Table.prototype.remove = function(seat) {
    // FIXME: Add virtual clients
    //this.seats[seat] = this.createVirtualClient(seat);
    delete this.seats[seat];
    this.onSeatsChanged();
};

Table.prototype.move = function(socket, dst) {
    var src = socket._seatId;
    delete this.seats[src];
    this.add(socket, dst);
};

Table.prototype.createVirtualClient = function(seat) {
    this._logger.log('creating virtual client at ' + seat);
    // TODO
    return null;
};

Table.prototype.sendFrom = function(srcSeat, msg) {
    Object.keys(this.seats)
        .filter(seat => seat !== srcSeat)  // Don't send to origin
        .forEach(seat => this.seats[seat].send(msg));
};

Table.prototype.sockets = function() {
    return R.values(this.seats)
        .filter(socket => !!socket);
};

Table.prototype.contains = function(username) {
    var seats = Object.keys(this.seats),
        socket;

    for (var i = seats.length; i--;) {
        socket = this.seats[seats[i]];
        if (socket && socket.username === username) {
            return true;
        }
    }
    return false;
};

//Table.prototype.remove = function(seat) {
//};

module.exports = Table;

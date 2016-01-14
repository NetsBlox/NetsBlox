
'use strict';

var R = require('ramda');
var ActiveTable = function(logger, name, leader) {
    var uuid = ActiveTable.createUUID(leader, name);
    this.name = name;
    this._logger = logger.fork('ActiveTable:' + uuid);
    this.uuid = uuid;
    // TODO: Add the server routing logic
    this.seats = {};
    this.leader = leader;
    this._logger.log('created!');
};

ActiveTable.createUUID = function(leader, name) {
    return `${leader.username}/${name}`;
};

ActiveTable.prototype.add = function(socket, seat) {
    // FIXME: verify that the seat exists
    if (this.seats[seat] === undefined) {  // Seat doesn't exist or is occupied
        this._logger.warn('Cannot add ' + (socket.username || socket.uuid) + ' to ' + seat);
        return;
    }

    if (this.seats[seat] && this.seats[seat].isVirtualClient()) {
        // TODO: Shutdown the virtual client
    }
    this.seats[seat] = socket;
    this.onSeatsChanged();  // Update all clients
};

ActiveTable.prototype.createSeat = function(seat) {
    // TODO
    this.seats[seat] = null;
    this.onSeatsChanged();
};

ActiveTable.prototype.removeSeat = function(seat) {
    delete this.seats[seat];
    this.onSeatsChanged();
};

ActiveTable.prototype.onSeatsChanged = function() {
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

ActiveTable.prototype.remove = function(seat) {
    // FIXME: Add virtual clients
    //this.seats[seat] = this.createVirtualClient(seat);
    delete this.seats[seat];
    this.onSeatsChanged();
};

ActiveTable.prototype.move = function(socket, dst) {
    var src = socket._seatId;
    delete this.seats[src];
    this.add(socket, dst);
};

ActiveTable.prototype.createVirtualClient = function(seat) {
    this._logger.log('creating virtual client at ' + seat);
    // TODO
    return null;
};

ActiveTable.prototype.sendFrom = function(srcSeat, msg) {
    Object.keys(this.seats)
        .filter(seat => seat !== srcSeat)  // Don't send to origin
        .forEach(seat => this.seats[seat].send(msg));
};

ActiveTable.prototype.sockets = function() {
    return R.values(this.seats)
        .filter(socket => !!socket);
};

ActiveTable.prototype.contains = function(username) {
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

ActiveTable.prototype.update = function(username) {
    var uuid = ActiveTable.createUUID(this.leader, this.name);
};

module.exports = ActiveTable;

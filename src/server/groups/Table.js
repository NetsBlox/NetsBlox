
'use strict';

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
    // TODO: Shutdown the virtual client
};

Table.prototype.remove = function(seat) {
    // FIXME: Add virtual clients
    //this.seats[seat] = this.createVirtualClient(seat);
    delete this.seats[seat];
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

//Table.prototype.remove = function(seat) {
//};

module.exports = Table;


'use strict';

var R = require('ramda'),
    utils = require('../ServerUtils');

// TODO: Create the table client
class ActiveTable {
    constructor(logger, name, leader) {
        var uuid = utils.uuid(leader.username, name);
        this.name = name;
        this._logger = logger.fork('ActiveTable:' + uuid);
        this.uuid = uuid;

        // Seats
        this.seats = {};  // actual occupants
        this.seatOwners = {};

        this.leader = leader;
        this._logger.log('created!');

        // RPC contexts
        this.rpcs = {};
    }

    add (socket, seat) {
        // FIXME: verify that the seat exists
        if (this.seatOwners[seat] !== socket.username &&
                !socket.isVirtualUser()) {  // virtual clients can sit anywhere

            this._logger.warn(`${socket.username} does not own seat ${seat}`);
            return;
        }

        if (this.seats[seat] && this.seats[seat].isVirtualUser()) {
            // TODO: Shutdown the virtual client
        }
        this.seats[seat] = socket;
        this.onSeatsChanged();  // Update all clients
    }

    createSeat (seat) {
        this.seats[seat] = null;
        this.seatOwners[seat] = null;
        this.onSeatsChanged();
    }

    updateSeat (seat) {
        var socket = this.seats[seat];
        this.seatOwners[seat] = socket.username;
        this.onSeatsChanged();
    }

    removeSeat (seat) {
        delete this.seats[seat];
        this.onSeatsChanged();
    }

    renameSeat (seatId, newId) {
        var socket = this.seats[seatId];

        if (socket) {  // update socket, too!
            socket._seatId = newId;
        }

        this.seats[newId] = this.seats[seatId];
        this.seatOwners[newId] = this.seatOwners[seatId];

        delete this.seats[seatId];
        delete this.seatOwners[seatId];
        this.onSeatsChanged();
    }

    getStateMsg () {
        var seats = {},
            msg;

        Object.keys(this.seatOwners)
            .forEach(seat => {
                seats[seat] = this.seatOwners[seat];
            });

        msg = [
            'table-seats',
            this.leader.username,
            this.name,
            JSON.stringify(seats)
        ].join(' ');
        return msg;
    }

    onSeatsChanged () {
        // This should be called when the table layout changes
        // Send the table info to the socket
        var msg = this.getStateMsg(),
            sockets = R.values(this.seats).filter(socket => !!socket);

        sockets.forEach(socket => socket.send(msg));
    }

    remove (seat) {
        // FIXME: Add virtual clients
        //this.seats[seat] = this.createVirtualClient(seat);
        delete this.seats[seat];
        this.onSeatsChanged();
    }

    move (socket, dst) {
        var src = socket._seatId;
        delete this.seats[src];
        this.add(socket, dst);
    }

    createVirtualClient (seat) {
        this._logger.log('creating virtual client at ' + seat);
        // TODO
        return null;
    }

    sendFrom (srcSeat, msg) {
        Object.keys(this.seats)
            .filter(seat => seat !== srcSeat)  // Don't send to origin
            .forEach(seat => this.seats[seat].send(msg));
    }

    sockets () {
        return R.values(this.seats)
            .filter(socket => !!socket);
    }

    contains (username) {
        var seats = Object.keys(this.seats),
            socket;

        for (var i = seats.length; i--;) {
            socket = this.seats[seats[i]];
            if (socket && socket.username === username) {
                return true;
            }
        }
        return false;
    }

    update () {
        var oldUuid = this.uuid;
        this.uuid = utils.uuid(this.leader.username, this.name);
        this._logger.trace('Updating uuid to ' + this.uuid);

        if (this.uuid !== oldUuid) {
            this.onUuidChange(oldUuid);
        }
    }
}

// Factory method
ActiveTable.fromStore = function(logger, socket, data) {
    var table = new ActiveTable(logger, data.name, socket);
    // Set up the seats
    table.seatOwners = data.seatOwners;
    table._uuid = data.uuid;  // save over the old uuid even if it changes
                              // this should be reset if the table is forked TODO
    return table;
};

module.exports = ActiveTable;

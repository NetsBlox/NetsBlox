// This is a wrapper around the storage table. It provides the extra functionality expected
// of a table that is actively being used

'use strict';

var R = require('ramda'),
    _ = require('lodash'),
    utils = require('../ServerUtils');

class ActiveTable {

    constructor(logger, name, owner) {
        var uuid = utils.uuid(owner.username, name);
        this.name = name;
        this._logger = logger.fork('ActiveTable:' + uuid);
        this.uuid = uuid;

        // Seats
        this.seats = {};  // actual occupants
        this.cachedProjects = {};  // 

        // virtual clients
        this.virtual = {};

        this.owner = owner;

        // RPC contexts
        this.rpcs = {};

        // Saving
        this._store = null;

        this._logger.log('created!');
    }

    // This should only be called by the TableManager (otherwise, the table will not be recorded)
    fork (logger, socket) {
        // Create a copy of the table with the socket as the new owner
        var fork = new ActiveTable(logger, this.name, socket),
            seats = Object.keys(this.seats),
            data;

        // Clone the table storage data
        data = this._store.fork(fork);
        fork.setStorage(data);

        seats.forEach(seat => fork.silentCreateSeat(seat));

        // Copy the data from each project
        fork.cachedProjects = _.cloneDeep(this.cachedProjects);

        // Notify the socket of the fork
        socket.send({
            type: 'project-fork',
            table: fork.name
        });
        fork.onSeatsChanged();
        this.onSeatsChanged();

        return fork;
    }

    add (socket, seat) {
        // FIXME: verify that the seat exists
        if (this.seats[seat] && this.seats[seat].isVirtualUser() && this.virtual[seat]) {
            this._logger.log('about to close vc at ' + seat);
            this.virtual[seat].close();
        }
        this._logger.trace(`adding ${socket.uuid} to ${seat}`);
        this.seats[seat] = socket;
        this.onSeatsChanged();  // Update all clients
    }

    createSeat (seat) {
        this.silentCreateSeat(seat);
        this.onSeatsChanged();
    }

    silentCreateSeat (seat) {
        this._logger.trace(`Adding seat ${seat}`);
        this.seats[seat] = null;
    }

    updateSeat () {
        this.onSeatsChanged();
    }

    removeSeat (seat) {
        this._logger.trace(`removing seat "${seat}"`);

        delete this.seats[seat];

        if (this.virtual[seat]) {
            this.virtual[seat].close();
            delete this.virtual[seat];
        }
        this.check();
        this.onSeatsChanged();
    }

    renameSeat (seatId, newId) {
        var socket = this.seats[seatId];

        if (socket) {  // update socket, too!
            socket._seatId = newId;
        }

        this.seats[newId] = this.seats[seatId];
        this.cachedProjects[newId] = this.cachedProjects[seatId];

        delete this.seats[seatId];
        this.onSeatsChanged();
        this.check();
    }

    getStateMsg () {
        var owners = {},
            occupied = {},
            msg;

        Object.keys(this.seats)
            .forEach(seat => {
                owners[seat] = this.seats[seat] ? this.seats[seat].username : null;
                occupied[seat] = !!this.seats[seat];
            });

        msg = {
            type: 'table-seats',
            owner: this.owner.username,
            name: this.name,
            owners: owners,
            occupied: occupied
        };
        return msg;
    }

    onSeatsChanged () {
        // This should be called when the table layout changes
        // Send the table info to the socket
        var msg = this.getStateMsg();

        this.sockets().forEach(socket => socket.send(msg));

        this.save();
    }

    setStorage(store) {
        this._store = store;
    }

    save() {
        // TODO: Remove this fn
    }

    move (params) {
        var src = params.src || params.socket._seatId,
            socket = this.seats[src],
            dst = params.dst;

        this._logger.info(`moving from ${src} to ${dst}`);
        this.seats[src] = null;
        this.add(socket, dst);
        this.check();
    }

    sendFrom (socket, msg) {
        this.sockets()
            .filter(s => s !== socket)  // Don't send to origin
            .forEach(socket => socket.send(msg));
    }

    sockets () {
        return R.values(this.seats)
            .filter(socket => !!socket);
    }

    ownerCount () {
        return this.sockets()
            .map(socket => socket.username)
            .filter(name => name === this.owner.username)
            .length;
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

    update (name) {
        var oldUuid = this.uuid;
        this.name = name || this.name;
        this.uuid = utils.uuid(this.owner.username, this.name);
        this._logger.trace('Updating uuid to ' + this.uuid);

        if (this.uuid !== oldUuid) {
            this.onUuidChange(oldUuid);
        }
        if (name) {
            this.onSeatsChanged();
        }
    }

    cache (seat, callback) {
        var socket = this.seats[seat];

        if (!socket) {
            let err = 'No socket in ' + seat;
            this._logger.error(err);
            return callback(err);
        }
        this._logger.trace('caching ' + seat);
        // Get the project json from the socket
        socket.getProjectJson((err, project) => {
            if (err) {
                return callback(err);
            }
            this.cachedProjects[seat] = project;
            return callback(err);
        });
    }

    close () {
        // Remove all sockets from this group
        var msg = {type: 'project-closed'};
        this.sockets().forEach(socket => socket.send(msg));
        this.destroy();
    }
}

// Factory method
ActiveTable.fromStore = function(logger, socket, data) {
    var table = new ActiveTable(logger, data.name, socket);

    // Store the data
    table.setStorage(data);

    // Set up the seats
    table._uuid = data.uuid;  // save over the old uuid even if it changes
                              // this should be reset if the table is forked TODO
    // load cached projects
    table.cachedProjects = data.seats;

    // Add the seats
    Object.keys(data.seats).forEach(seat => table.seats[seat] = null);
    return table;
};

module.exports = ActiveTable;

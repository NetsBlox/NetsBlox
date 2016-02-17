// This is a wrapper around the storage table. It provides the extra functionality expected
// of a table that is actively being used

'use strict';

var R = require('ramda'),
    _ = require('lodash'),
    utils = require('../ServerUtils');

class ActiveTable {

    constructor(logger, name, leader) {
        var uuid = utils.uuid(leader.username, name);
        this.name = name;
        this._logger = logger.fork('ActiveTable:' + uuid);
        this.uuid = uuid;

        // Seats
        this.seats = {};  // actual occupants
        this.seatOwners = {};
        this.cachedProjects = {};  // 

        // virtual clients
        this.virtual = {};

        this.leader = leader;

        // RPC contexts
        this.rpcs = {};

        // Saving
        this._store = null;

        this._logger.log('created!');
    }

    // This should only be called by the TableManager (otherwise, the table will not be recorded)
    fork (logger, socket) {
        // Create a copy of the table with the socket as the new leader
        var fork = new ActiveTable(logger, this.name, socket),
            seats = Object.keys(this.seats),
            currentSeat = socket._seatId,
            data;

        // Clone the table storage data
        data = this._store.fork(fork);
        fork.setStorage(data);

        seats.forEach(seat => fork.silentCreateSeat(seat));
        fork.seatOwners[currentSeat] = socket.username;

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
        if (this.seatOwners[seat] !== socket.username &&
                !socket.isVirtualUser()) {  // virtual clients can sit anywhere

            this._logger.warn(`${socket.username} does not own seat ${seat}`);
            return;
        }

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
        this.seatOwners[seat] = null;
        this.createVirtualClient(seat);
    }

    updateSeat (seat) {
        var socket = this.seats[seat];
        this.seatOwners[seat] = socket.username;
        this.onSeatsChanged();
    }

    removeSeat (seat) {
        this._logger.trace(`removing seat "${seat}"`);

        delete this.seats[seat];
        delete this.seatOwners[seat];

        if (this.virtual[seat]) {
            this.virtual[seat].close();
            delete this.virtual[seat];
        }
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
        var owners = {},
            occupied = {},
            msg;

        Object.keys(this.seatOwners)
            .forEach(seat => {
                owners[seat] = this.seatOwners[seat];
                occupied[seat] = !!this.seats[seat];
            });

        msg = {
            type: 'table-seats',
            leader: this.leader.username,
            name: this.name,
            owners: owners,
            occupied: occupied
        };
        return msg;
    }

    onSeatsChanged () {
        // This should be called when the table layout changes
        // Send the table info to the socket
        var msg = this.getStateMsg(),
            sockets = R.values(this.seats).filter(socket => !!socket);

        sockets.forEach(socket => socket.send(msg));

        this.save();
    }

    setStorage(store) {
        this._store = store;
    }

    save() {
        // Save the updated table in the global tables database
        this._store.saveSeats(err => {
            if (err) {
                this._logger.error('Could not save:', err);
                return;
            }
            this._logger.trace('seat metadata saved');
        });
    }

    move (params) {
        var src = params.src || params.socket._seatId,
            socket = this.seats[src],
            dst = params.dst;

        console.log('src:', src);
        this.seats[src] = null;
        this.add(socket, dst);
    }

    createVirtualClient (seat) {
        //this._logger.log('creating virtual client at ' + seat);
        //var client = new VirtualClient(this._logger, HOST);
        //client.connect(() => {
            //// open the correct project
            //// TODO
            //console.log('connected!');
        //});
        //this.virtual[seat] = client;
        return null;
    }

    sendFrom (srcSeat, msg) {
        Object.keys(this.seats)
            .filter(seat => seat !== srcSeat)  // Don't send to origin
            .filter(seat => !!this.seats[seat])  // Make sure it is occupied
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

    update (name) {
        var oldUuid = this.uuid;
        this.name = name || this.name;
        this.uuid = utils.uuid(this.leader.username, this.name);
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
}

// Factory method
ActiveTable.fromStore = function(logger, socket, data) {
    var table = new ActiveTable(logger, data.name, socket);

    // Store the data
    table.setStorage(data);

    // Set up the seats
    table.seatOwners = data.seatOwners;
    table._uuid = data.uuid;  // save over the old uuid even if it changes
                              // this should be reset if the table is forked TODO
    return table;
};

module.exports = ActiveTable;

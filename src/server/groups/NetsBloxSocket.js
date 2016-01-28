/*
 * This is a socket for NetsBlox that wraps a standard WebSocket
 */
'use strict';
var counter = 0,
    CONSTANTS = require(__dirname + '/../../common/Constants'),
    PROJECT_FIELDS = ['ProjectName', 'SourceCode', 'Media', 'SourceSize', 'MediaSize', 'TableUuid'],
    R = require('ramda'),
    parseXml = require('xml2js').parseString;

var createSaveableProject = function(json, callback) {
    var project = R.pick(PROJECT_FIELDS, json);
    // Set defaults
    project.Public = false;
    project.Updated = new Date();

    // Add the thumbnail,notes from the project content
    var inProjectSource = ['Thumbnail', 'Notes'];

    parseXml(project.SourceCode, (err, jsonSrc) => {
        if (err) {
            return callback(err);
        }
        inProjectSource.forEach(field => {
            project[field] = jsonSrc[field.toLowerCase()];
        });
        callback(null, project);
    });
};

class NetsBloxSocket {
    constructor (logger, socket) {
        var id = ++counter;
        this.id = id;
        this.uuid = '_client_'+id;
        this._logger = logger.fork(this.uuid);

        this._seatId = null;
        this._tableId = null;
        this._table = null;
        this.loggedIn = false;

        this.username = this.uuid;
        this._socket = socket;
        this._projectRequests = {};  // saving
        this._initialize();

        // Provide a uuid
        this.send({type: 'uuid', body: this.uuid});
        this._logger.trace('created');
    }


    hasTable (msg) {
        if (!this._table) {
            this._logger.error('user has no table!');
        }
        return !!this._table;
    }

    _initialize (msg) {
        this._socket.on('message', data => {
            var msg = JSON.parse(data),
                type = msg.type;

            this._logger.trace(`received "${type === 'project-response' ? type : data}" message`);
            if (NetsBloxSocket.MessageHandlers[type]) {
                NetsBloxSocket.MessageHandlers[type].call(this, msg);
            } else {
                this._logger.warn('message "' + data + '" not recognized');
            }
        });

        this._socket.on('close', data => {
            this._logger.trace('closed!');
            if (this._table) {
                this.leave();
            }
            this.onClose(this.uuid);
        });
    }

    onLogin (username) {
        this._logger.log('logged in as ' + username);
        this.username = username;
        this.loggedIn = true;

        // Update the user's table name
        if (this._table) {
            this._table.update();
            // Update the seatOwner for the given seat
            if (this._table.seats[this._seatId] === this) {
                this._table.seatOwners[this._seatId] = this.username;
                this._table.updateSeat(this._seatId);
            }
        }
    }

    join (table, seat) {
        seat = seat || this._seatId;
        if (this._table === table) {
            return this.changeSeats(seat);
        }

        this._logger.log(`joining ${table.uuid}/${seat}`);
        if (this._table) {
            this.leave();
        }

        this._table = table;
        this._table.add(this, seat);
        this._seatId = seat;
    }

    assignSeat (seat, username) {
        if (!this._table) {
            return this._logger.warn('Cannot assign seat when table does not exist!');
        }
        if (!this._table.seatOwners.hasOwnProperty(seat)) {
            return this._logger.warn('Cannot assign seat when seat does not exist!');
        }
        this._table.seatOwners[seat] = username;
    }

    // This should only be called internally *EXCEPT* when the socket is going to close
    leave () {
        this._table.seats[this._seatId] = null;
        this.checkTable(this._table);
    }

    changeSeats (seat) {
        this._logger.log(`changing to seat ${this._table.uuid}/${seat}`);
        this._table.move(this, seat);
    }

    sendToEveryone (msg) {
        this._table.sendFrom(this._seatId, msg);
    }

    send (msg) {
        msg = JSON.stringify(msg);
        this._logger.trace(`Sending message to ${this.uuid} "${msg}"`);
        if (this._socket.readyState === this.OPEN) {
            this._socket.send(msg);
        } else {
            this._logger.log('could not send msg - socket no longer open');
        }
    }

    getState () {
        return this._socket.readyState;
    }

    isVirtualUser () {
        return this.username === CONSTANTS.GHOST.USER;
    }

    getProjectJson (callback) {
        var id = ++counter;
        this.send({
            type: 'project-request',
            id: id
        });
        this._projectRequests[id] = callback;
    }
}

// From the WebSocket spec
NetsBloxSocket.prototype.CONNECTING = 0;
NetsBloxSocket.prototype.OPEN = 1;
NetsBloxSocket.prototype.CLOSING = 2;
NetsBloxSocket.prototype.CLOSED = 3;

NetsBloxSocket.MessageHandlers = {
    'message': function(msg) {
        this.sendToEveryone(msg);
    },

    'project-response': function(msg) {
        var id = msg.id,
            json = msg.project;

        createSaveableProject(json, (err, project) => {
            if (err) {
                return this._projectRequests[id].call(null, err);
            }
            this._logger.log('created saveable project for request ' + id);
            this._projectRequests[id].call(null, null, project);
            delete this._projectRequests[id];
        });
    },

    'rename-table': function(msg) {
        if (this.hasTable()) {
            this._table.name = msg.name;
            this._table.update();
        }
    },

    'rename-seat': function(msg) {
        if (this.hasTable() && msg.seatId !== msg.name) {
            this._table.renameSeat(msg.seatId, msg.name);
        }
    },

    'request-table-state': function() {
        if (this.hasTable()) {
            var msg = this._table.getStateMsg();
            this.send(msg);
        }
    },

    'create-table': function(msg) {
        var table = this.createTable(this, msg.table);
        table.createSeat(msg.seat);
        table.seatOwners[msg.seat] = this.username;
        this.join(table, msg.seat);
    },

    'join-table': function(msg) {
        var leader = msg.leader,
            name = msg.table,
            seat = msg.seat;

        this.getTable(leader, name, (table) => {
            // create the seat if need be (and if we are the owner)
            if (!table.seats.hasOwnProperty(seat) && table.leader === this) {
                this._logger.info(`creating seat ${seat} at ${table.uuid}`);
                table.createSeat(seat);
                table.seatOwners[seat] = this.username;
            }
            return this.join(table, seat);
        });
        
    },
    'add-seat': function(msg) {
        // TODO: make sure this is the table leader
        if (this.hasTable()) {
            this._table.createSeat(msg.name);
        }
    }
};

module.exports = NetsBloxSocket;

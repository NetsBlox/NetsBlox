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
        socket.send('uuid '+ this.uuid);
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
            var msg = data.split(' '),
                type = msg.shift();

            this._logger.trace(`received "${type === 'project-response' ? type : data}" message`);
            if (NetsBloxSocket.MessageHandlers[type]) {
                NetsBloxSocket.MessageHandlers[type].apply(this, msg);
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

    leave () {
        this._table.remove(this._seatId);
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
        this.send('project-request ' + id);
        this._projectRequests[id] = callback;
    }
}

// From the WebSocket spec
NetsBloxSocket.prototype.CONNECTING = 0;
NetsBloxSocket.prototype.OPEN = 1;
NetsBloxSocket.prototype.CLOSING = 2;
NetsBloxSocket.prototype.CLOSED = 3;

// TODO: Every message should contain the sender and receiver
NetsBloxSocket.MessageHandlers = {
    'message': function() {
        var rawMsg = Array.prototype.slice.call(arguments);
        rawMsg.unshift('message');
        this.sendToEveryone(rawMsg.join(' '));
    },

    'table-message': function() {
        // TODO: Send a message to the table client
        var rawMsg = Array.prototype.slice.call(arguments),
            msg;

        rawMsg.unshift('message');
        msg = rawMsg.join(' ');
        this._logger.trace(`sending message to table: "${msg}"`);
    },

    'project-response': function(id) {
        var content = Array.prototype.slice.call(arguments, 1).join(' '),
            json = JSON.parse(content);

        createSaveableProject(json, (err, project) => {
            if (err) {
                return this._projectRequests[id].call(null, err);
            }
            this._logger.log('created saveable project for request ' + id);
            this._projectRequests[id].call(null, null, project);
            delete this._projectRequests[id];
        });
    },

    'rename-table': function(tableName) {
        if (this.hasTable()) {
            this._table.name = tableName;
            this._table.update();
        }
    },

    'rename-seat': function(seatId, newId) {
        if (this.hasTable()) {
            this._table.renameSeat(seatId, newId);
        }
    },

    'request-table-state': function() {
        if (this.hasTable()) {
            var msg = this._table.getStateMsg();
            this.send(msg);
        }
    },

    'create-table': function(tableName, seat) {
        var table = this.createTable(this, tableName);
        table.createSeat(seat);
        table.seatOwners[seat] = this.username;
        this.join(table, seat);
    },

    'join-table': function(leader, name, seat) {
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
    'add-seat': function(seatName) {
        // TODO: make sure this is the table leader
        if (this.hasTable()) {
            this._table.createSeat(seatName);
        }
    }
};

module.exports = NetsBloxSocket;

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
    this._projectRequests = {};  // saving
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
    'message': function() {
        var rawMsg = Array.prototype.slice.call(arguments);
        rawMsg.unshift('message');
        this.sendToTable(rawMsg.join(' '));
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

    'username': function(username) {  // FIXME: this is insecure!
        console.log('setting username to ' + username);
        this.username = username;
    },

    'create-table': function(tableName, seat) {
        var table = this.createTable(this, tableName);
        table.createSeat(seat);
        table.seatOwners[seat] = this.username;
        this.join(table, seat);
    },

    'join-table': function(uuid, name, seat) {
        this.getTable(uuid, name, (table) => {
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
        if (!this._table) {
            this._logger.error('can not create seat - user has no table!');
            return;
        }
        // TODO: make sure this is the table leader
        this._table.createSeat(seatName);
    }
};

NetsBloxSocket.prototype._initialize = function(msg) {
    this._socket.on('message', data => {
        this._logger.trace('received "' + data+ '"');
        var msg = data.split(' '),
            type = msg.shift();

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
};

NetsBloxSocket.prototype.onLogin = function(username) {
    this._logger.log('logged in as ' + username);
    this.username = username;

    // Update the user's table name
    if (this._table) {
        this._table.update();
    }
};

NetsBloxSocket.prototype.join = function(table, seat) {
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
};

NetsBloxSocket.prototype.assignSeat = function(seat, username) {
    if (!this._table) {
        return this._logger.warn('Cannot assign seat when table does not exist!');
    }
    if (!this._table.seatOwners.hasOwnProperty(seat)) {
        return this._logger.warn('Cannot assign seat when seat does not exist!');
    }
    this._table.seatOwners[seat] = username;
};

NetsBloxSocket.prototype.leave = function() {
    this._table.remove(this._seatId);
    this.checkTable(this._table);
};

NetsBloxSocket.prototype.changeSeats = function(seat) {
    this._logger.log(`changing to seat ${this._table.uuid}/${seat}`);
    this._table.move(this, seat);
};

NetsBloxSocket.prototype.sendToTable = function(msg) {
    this._table.sendFrom(this._seatId, msg);
};

NetsBloxSocket.prototype.send = function(msg) {
    this._logger.trace(`Sending message to ${this.uuid} "${msg}"`);
    if (this._socket.readyState === this.OPEN) {
        this._socket.send(msg);
    } else {
        this._logger.log('could not send msg - socket no longer open');
    }
};

NetsBloxSocket.prototype.getState = function() {
    return this._socket.readyState;
};

NetsBloxSocket.prototype.isVirtualUser = function() {
    return this.username === CONSTANTS.GHOST.USER;
};

NetsBloxSocket.prototype.getProjectJson = function(callback) {
    var id = ++counter;
    this.send('project-request ' + id);
    this._projectRequests[id] = callback;
};

module.exports = NetsBloxSocket;

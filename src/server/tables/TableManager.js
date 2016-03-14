/*
 * TableManager manages all the tables. This includes:
 *  + Creating virtual clients for the projects w/o users
 *  + Getting the active peers at a table (for saving)
 */

'use strict';

var ActiveTable = require('./ActiveTable'),
    utils = require('../ServerUtils');

var TableManager = function(logger) {
    var self = this;
    this._logger = logger.fork('Tables');
    this.tables = {};
    if (!this.storage) {
        this._logger.warn('missing storage component!');
    }

    ActiveTable.prototype.onUuidChange = function(oldUuid) {
        var table = this;
        // update the tables dictionary
        self._logger.trace(`moving record from ${oldUuid} to ${table.uuid}`);
        self.tables[table.uuid] = table;
        delete self.tables[oldUuid];
    };

    ActiveTable.prototype.destroy = function() {
        this._logger.trace(`Removing table ${this.uuid}`);
        delete self.tables[this.uuid];
    };

    ActiveTable.prototype.check = function() {
        self.checkTable(this);
    };
};

TableManager.prototype.forkTable = function(params) {
    var table = params.table,
        socket = params.socket || table.seats[params.seatId],
        newTable;

    if (socket === table.owner) {
        this._logger.error(`${socket.username} tried to fork it's own table: ${table.name}`);
        return;
    }

    this._logger.trace(`${params.seatId} is forking table`);
    this._logger.trace(`${socket.username} is forking table ${table.uuid}`);

    // Create the new table
    newTable = table.fork(this._logger, socket);
    this.tables[newTable.uuid] = newTable;
    socket.join(newTable);
};

TableManager.prototype.createTable = function(socket, name, ownerId) {
    ownerId = ownerId || socket.username;
    var uuid = utils.uuid(ownerId, name);
    if (!!this.tables[uuid]) {
        this._logger.error('table already exists! (' + uuid + ')');
    }

    this.tables[uuid] = new ActiveTable(this._logger, name, socket);
    // Create the data element
    var data = this.storage.tables.new(null, this.tables[uuid]);
    this.tables[uuid].setStorage(data);

    return this.tables[uuid];
};

TableManager.prototype.getTable = function(socket, ownerId, name, callback) {
    var uuid = utils.uuid(ownerId, name);
    if (!this.tables[uuid]) {
        this.storage.users.get(ownerId, (err, user) => {
            // Get the table
            var table = user && user.tables.find(table => table.name === name);
            if (!table) {
                this._logger.error(err || 'No table found for ' + uuid);
                // If no table is found, create a new table for the user
                table = table || this.createTable(socket, name, ownerId);
                this.tables[uuid] = table;
                return callback(table);
            }

            this._logger.trace(`retrieving table ${uuid} from database`);
            var activeTable = ActiveTable.fromStore(this._logger, socket, table);
            this.tables[uuid] = activeTable;
            return callback(activeTable);
        });

    } else {
        return callback(this.tables[uuid]);
    }
};

TableManager.prototype._createTable = function(socket, ownerId, name, callback) {
};

TableManager.prototype.onCreate = function() {
};

TableManager.prototype.getActiveMembers = function() {
};

TableManager.prototype.checkTable = function(table) {
    var uuid = table.uuid,
        seats = Object.keys(table.seats)
            .filter(seat => !!table.seats[seat]);

    this._logger.trace('Checking table ' + uuid + ' (' + seats.length + ')');
    if (seats.length === 0) {
        // FIXME: This will need to be updated for virtual clients
        this._logger.trace('Removing empty table: ' + uuid);
        delete this.tables[uuid];
    }
};

module.exports = TableManager;

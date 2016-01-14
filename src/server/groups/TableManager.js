/*
 * TableManager manages all the tables. This includes:
 *  + Creating virtual clients for the projects w/o users
 *  + Getting the active peers at a table (for saving)
 */

'use strict';

var ActiveTable = require('./ActiveTable');

var TableManager = function(logger) {
    this._logger = logger.fork('Tables');
    this.tables = {};
    if (!this.storage) {
        this._logger.warn('missing storage component!');
    }
};

TableManager.prototype.create = function(socket, name) {
    var uuid = ActiveTable.createUUID(socket, name);
    if (!!this.tables[uuid]) {
        this._logger.error('table already exists! (' + uuid + ')');
    }
    this.tables[uuid] = new ActiveTable(this._logger, name, socket);
    return this.tables[uuid];
};

TableManager.prototype.getTable = function(socket, uuid, name, callback) {
    if (!this.tables[uuid]) {
        // If table is not active, try to retrieve it from the db
        this.storage.tables.get(uuid, (err, table) => {  // global only FIXME!
            if (err || !table) {
                this._logger.error(err || 'No table found for ' + uuid);
                // If no table is found, create a new table for the user
                table = table || new ActiveTable(this._logger, name, socket);
                this.tables[uuid] = table;
                return callback(table);
            }
            // Create an active table from the global stored table
            var activeTable = ActiveTable.fromStore(this._logger, socket, table);
            this.tables[uuid] = activeTable;
            return callback(activeTable);
        });
        this._logger.trace('Checking database for table');
    } else {
        return callback(this.tables[uuid]);
    }
};

TableManager.prototype.onCreate = function(id) {
};

TableManager.prototype.getActiveMembers = function() {
};

TableManager.prototype.checkTable = function(table) {
    var uuid = table.uuid,
        seats = Object.keys(table.seats);

    if (seats.length === 0) {
        // FIXME: This will need to be updated for virtual clients
        this._logger.trace('Removing empty table: ' + uuid);
        delete this.tables[uuid];
    }
};

module.exports = TableManager;

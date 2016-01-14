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
};

TableManager.prototype.create = function(socket, name) {
    var uuid = ActiveTable.createUUID(socket, name);
    if (!!this.tables[uuid]) {
        this._logger.error('table already exists! (' + uuid + ')');
    }
    this.tables[uuid] = new ActiveTable(this._logger, name, socket);
    return this.tables[uuid];
};

TableManager.prototype.get = function(uuid) {
    return this.tables[uuid] || null;
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

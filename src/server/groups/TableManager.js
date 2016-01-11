/*
 * TableManager manages all the tables. This includes:
 *  + Creating virtual clients for the projects w/o users
 *  + Getting the active peers at a table (for saving)
 */

'use strict';

var Table = require('./Table');
var TableManager = function(logger) {
    this._logger = logger.fork('Tables');
    this.tables = {};
};

TableManager.prototype.get = function(uuid, socketId) {
    if (!this.tables[uuid]) {
        // FIXME: the requestor should not be set to the leader...
        this.tables[uuid] = new Table(this._logger, uuid, socketId);
    }
    return this.tables[uuid];
};

TableManager.prototype.onCreate = function(id) {
};

TableManager.prototype.getActiveMembers = function() {
};

module.exports = TableManager;

'use strict';

var DataWrapper = require('./Data'),
    async = require('async');

class TableStore {
    constructor(logger, db) {
        this._logger = logger.fork('Tables');
        this._tables = db.collection('tables');
    }

    get(leaderId, name, callback) {
        // Get the table from the global store
        this._tables.findOne({leaderId, name}, (e, data) => {
            var params = {
                logger: this._logger,
                db: this._tables,
                data
            };
            // The returned table is read-only (no user set)
            callback(e, data ? new Table(params) : null);
        });
    }

    get(uuid, callback) {
        // TODO: Get the table from 
    }

    // Create table from ActiveTable (request projects from clients)
    new(user, activeTable) {
        return new Table({
            logger: this._logger,
            db: this._tables,
            user: user,
            table: activeTable
        });
    }
}

// Every time a table is saved, it is saved for some user AND in the global store
// Schema:
// + uuid (leaderId/name)
// + name
// + leaderId
// + lastUpdated
// + seatOwners

class Table extends DataWrapper {
    constructor(params) {
        super(params.db, params.data || {});
        this._logger = params.logger.fork('Table' + (this._table ? ':' + this._table.uuid : ''));
        this._user = params.user;
        this._table = params.table;
    }

    // Override
    collectProjects(callback) {
        // Collect the projects from the websockets
        var sockets = this._table.sockets();
        async.map(sockets, (socket, callback) => {
            socket.getProjectJson(callback);
        }, (err, projects) => {
            if (err) {
                return callback(err);
            }

            // create the table from the projects
            var content = {
                uuid: this._table.uuid,
                name: this._table.name,
                leaderId: this._table.leader.username,
                seatOwners: {},
                seats: {}
            };

            console.log('arguments:', arguments);
            for (var i = sockets.length; i--;) {
                // seat content
                content.seats[sockets[i]._seatId] = projects[i];
                // seat owners
                content.seatOwners[sockets[i]._seatId] = sockets[i].username;
            }
            callback(null, content);
        });
    }

    // Override
    save(callback) {
        if (!this._user) {
            return this._save(callback);
            //return callback('Cannot save table without a user!');
        }
        this.collectProjects((err, content) => {
            if (err) {
                this._logger.error('could not save table: ' + err);
                return callback(err);
            }
            this._logger.trace('collected projects for ' + this._user.username);
            this._content = content;
            this._save(callback);
        });
    }

    // Override
    _saveable() {
        if (this._user) {
            return this._content;
        }
        return DataWrapper.prototype._saveable.call(this);
    }

    _save(callback) {
        var table = this._saveable(),
            index;

        // Every time a local table is saved, it is saved for the user AND in the global store
        // Create the global table and save it
        DataWrapper.prototype.save.call(this);

        // Add this project to the user's list of tables and save the user
        this._user.tables = this._user.tables || [];
        index = this._user.tables.reduce((i, table, index) => {
            if (i > -1) {
                return i;
            }
            return table.leaderId === this._table.leader.username &&
                table.name === this._table.name ? index : i;
        }, -1);

        if (index === -1) {
            this._user.tables.push(table);
        } else {
            this._user.tables.splice(index, 1, table);
        }
        this._user.save();
        this._logger.log(`saved table "${table.uuid}" for ${this._user.username}`);
        callback(null);
    }

    destroy() {
        // remove the table from the user's list
        // TODO
        // set the user's 
        // TODO
    }
}

var EXTRA_KEYS = ['_user', '_table', '_content', '_logger'];
Table.prototype.IGNORE_KEYS = DataWrapper.prototype.IGNORE_KEYS.concat(EXTRA_KEYS);

module.exports = TableStore;

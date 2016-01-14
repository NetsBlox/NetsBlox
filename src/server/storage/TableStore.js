'use strict';

var DataWrapper = require('./Data'),
    async = require('async');

class TableStore {
    constructor(logger, db) {
        this._logger = logger.fork('Tables');
        this._tables = db.collection('tables');
    }

    get(uuid, callback) {
        // Get the table from the global store
        this._tables.findOne({uuid}, (e, data) => {
            var params = {
                logger: this._logger,
                db: this._tables,
                data
            };
            // The returned table is read-only (no user set)
            callback(e, data ? new Table(params) : null);
        });
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
        this._logger = params.logger.fork((this._table ? this._table.uuid : this.uuid));
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
            var seats = Object.keys(this._table.seats),
                socket,
                k,
                content = {
                    uuid: this._table.uuid,
                    name: this._table.name,
                    leaderId: this._table.leader.username,
                    seatOwners: {},
                    seats: {}
                };

            for (var i = seats.length; i--;) {
                socket = this._table.seats[seats[i]];
                // seat owners
                content.seatOwners[seats[i]] = socket ? socket.username : null;

                k = sockets.indexOf(socket);
                if (k !== -1) {
                    // seat content
                    content.seats[seats[i]] = projects[k];
                } else {
                    content.seats[seats[i]] = null;
                }
            }
            callback(null, content);
        });
    }

    prepare() {
        // regenerate the uuid
        this.uuid = `${this.leaderId}/${this.name}`;
    }

    // Override
    save(callback) {
        if (!this._user) {
            this._logger.trace('saving globally only');
            DataWrapper.prototype.save.call(this);
            return callback(null);
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
        // Set the id...
        this._db.replaceOne(
            {uuid: table.uuid},  // search criteria
            table,  // new value
            {upsert: true},  // settings
            (e, data) => {
                if (e) {
                    this._logger.error(e);
                }
                this._logger.trace('updated in global table database');
                // Add this project to the user's list of tables and save the user
                index = this._user.tables.reduce((i, table, index) => {
                    if (i > -1) {
                        return i;
                    }
                    return table.leaderId === this._table.leader.username &&
                        table.name === this._table.name ? index : i;
                }, -1);

                console.log('table seatOwners:', table.seatOwners);
                if (index === -1) {
                    this._user.tables.push(table);
                } else {
                    this._user.tables.splice(index, 1, table);
                }
                this._user.save();
                this._logger.log(`saved table "${table.uuid}" for ${this._user.username}`);
                callback(null);
            }
        );
    }

    pretty() {
        var prettyTable = this._saveable();
        Object.keys(prettyTable.seats || {})
            .forEach(seat => {
                if (prettyTable.seats[seat]) {
                    prettyTable.seats[seat] = '<project xml>';
                }
            });

        return prettyTable;

    }

    destroy() {
        // remove the table from the user's list
        // TODO
        // set the user's 
        // TODO
    }
}

var EXTRA_KEYS = ['_user', '_table', '_content'];
Table.prototype.IGNORE_KEYS = DataWrapper.prototype.IGNORE_KEYS.concat(EXTRA_KEYS);

module.exports = TableStore;

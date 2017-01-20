'use strict';
var MongoClient = require('mongodb').MongoClient,
    RPCStore = require('../rpc/storage'),
    UserStore = require('./user-store'),
    RoomStore = require('./room-store'),
    UserActions = require('./user-actions');

var Storage = function(logger) {
    this._logger = logger.fork('Storage');

    this.users = null;
    this.rooms = null;
};

Storage.prototype.connect = function() {
    var mongoURI = process.env.MONGO_URI || process.env.MONGOLAB_URI || 'mongodb://localhost:27017';
    return MongoClient.connect(mongoURI)
        .then(db => {
            this.users = new UserStore(this._logger, db);
            this.rooms = new RoomStore(this._logger, db);
            RPCStore.init(this._logger, db);
            UserActions.init(this._logger, db);

            this._db = db;
            this._logger.info(`Connected to ${mongoURI}`);
        })
        .catch(err => this._logger.error(err));
};

Storage.prototype.disconnect = function() {
    return this._db.close(true);
};

module.exports = Storage;

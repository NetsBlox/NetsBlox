'use strict';
var MongoClient = require('mongodb').MongoClient,
    RPCStore = require('../rpc/storage'),
    UserStore = require('./UserStore'),
    RoomStore = require('./RoomStore'),
    UserActions = require('./UserActions'),
    connectOpts = {
        keepAlive: 1,
        connectTimeoutMS: 30000
    };

var Storage = function(logger) {
    this._logger = logger.fork('Storage');

    this.users = null;
    this.rooms = null;
};

Storage.prototype.connect = function() {
    var mongoURI = process.env.MONGO_URI || process.env.MONGOLAB_URI || 'mongodb://localhost:27017';
    return MongoClient.connect(mongoURI, connectOpts)
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
    this._logger.trace('closing mongo connection');
    return this._db.close(true);
};

module.exports = Storage;

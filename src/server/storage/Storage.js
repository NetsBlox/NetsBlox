'use strict';
var MongoClient = require('mongodb').MongoClient,
    RPCStore = require('../rpc/storage'),
    UserStore = require('./UserStore'),
    RoomStore = require('./RoomStore');

var Storage = function(logger, opts) {
    this._logger = logger.fork('Storage');
    this._mongoURI = opts.mongoURI || 'mongodb://localhost:27017';
    this._transporter = opts.transporter;

    this.users = null;
    this.rooms = null;
};

Storage.prototype.connect = function(callback) {
    MongoClient.connect(this._mongoURI, (err, db) => {
        if (err) {
            throw err;
        }

        this.users = new UserStore(this._logger, db, this._transporter);
        this.rooms = new RoomStore(this._logger, db);
        RPCStore.init(this._logger, db);

        // TODO: Initialize collections
        this.onDatabaseConnected();

        console.log('Connected to '+this._mongoURI);
        callback(err);
    });
};

Storage.prototype.onDatabaseConnected = function() {
};

module.exports = Storage;

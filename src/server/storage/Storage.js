'use strict';
var MongoClient = require('mongodb').MongoClient,
    hash = require('../../client/sha512').hex_sha512,
    UserStore = require('./UserStore'),
    TableStore = require('./TableStore'),
    CONSTANTS = require(__dirname + '/../../common/Constants');


var Storage = function(logger, opts) {
    this._logger = logger.fork('Storage');
    this._mongoURI = opts.mongoURI || 'mongodb://localhost:27017';
    this._transporter = opts.transporter;

    this.users = null;
    this.tables = null;
};

Storage.prototype.connect = function(callback) {
    MongoClient.connect(this._mongoURI, (err, db) => {
        if (err) {
            throw err;
        }

        this.users = new UserStore(this._logger, db, this._transporter);
        this.tables = new TableStore(this._logger, db);
        this.onDatabaseConnected();

        console.log('Connected to '+this._mongoURI);
        callback(err);
    });
};

Storage.prototype.onDatabaseConnected = function() {
};

module.exports = Storage;

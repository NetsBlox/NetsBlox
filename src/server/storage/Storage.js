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
    // Add the ghost user if it doesn't exist
    // Check for the ghost user
    var username = CONSTANTS.GHOST.USER,
        password = CONSTANTS.GHOST.PASSWORD,
        email = CONSTANTS.GHOST.EMAIL;

    this.users.get(username, (e, user) => {
        if (e) {
            return this._logger.log('Error:', e);
        }
        if (!user) {
            // Create the user with the given username, email, password
            var newUser = this.users.new(username, email);

            this._users.insert(newUser, (err, result) => {
                if (err) {
                    return this._logger.log('Error:', err);
                }
                this._logger.log('Created ghost user.');
            });
        } else {
            this._logger.info('Setting ghost user\'s password to tmp');
            // Set the password
            //delete user.hash;  // regenerate password
            user.hash = hash('tmp');
            user.save();
        }
    });
};

module.exports = Storage;

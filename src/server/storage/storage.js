'use strict';
var MongoClient = require('mongodb').MongoClient,
    RPCStore = require('../rpc/storage'),
    Users = require('./users'),
    Projects = require('./projects'),
    UserActions = require('./user-actions'),
    PublicProjects = require('./public-projects');

var Storage = function(logger) {
    this._logger = logger.fork('storage');

    this.users = null;
    this.projects = null;
    this.connected = false;
};

Storage.prototype.connect = function(mongoURI) {
    mongoURI = mongoURI || process.env.MONGO_URI || process.env.MONGOLAB_URI || 'mongodb://localhost:27017';
    return MongoClient.connect(mongoURI)
        .then(db => {
            this.connected = true;
            this.users = Users;
            this.projects = Projects;
            Users.init(this._logger, db);
            Projects.init(this._logger, db);
            RPCStore.init(this._logger, db);
            UserActions.init(this._logger, db);
            PublicProjects.init(this._logger, db);
            this.publicProjects = PublicProjects;

            this._db = db;
            this._logger.info(`Connected to ${mongoURI}`);
            return db;
        })
        .catch(err => {
            console.error(`Could not connect to mongodb at ${mongoURI}.`);
            console.error('To connect to a different mongo instance, set MONGO_URI to the mongo uri and try again:');
            console.error('');
            console.error('    MONGO_URI=mongodb://some.ip.address:27017/ netsblox start');
            console.error('');
            console.error('or, if running from the root of the netsblox project:');
            console.error('');
            console.error('    MONGO_URI=mongodb://some.ip.address:27017/ ./bin/netsblox start');
            console.error('');
            throw err;
        });
};

Storage.prototype.disconnect = function() {
    return this._db.close(true);
};

module.exports = Storage;

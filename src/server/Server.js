'use strict';
var express = require('express'),
    bodyParser = require('body-parser'),
    _ = require('lodash'),
    Utils = _.extend(require('./Utils'), require('./ServerUtils.js')),
    SocketManager = require('./SocketManager'),
    RPCManager = require('./rpc/RPCManager'),
    MobileManager = require('./mobile/MobileManager'),
    MongoClient = require('mongodb').MongoClient,
    Vantage = require('./vantage/Vantage'),
    DEFAULT_OPTIONS = {
        port: 8080,
        vantage: true,
        mongoURI: 'mongodb://localhost:27017'
    },

    // Mailer
    nodemailer = require('nodemailer'),
    markdown = require('nodemailer-markdown').markdown,
    transporter = nodemailer.createTransport(),  // TODO: Change to smtp

    // Routes
    createRouter = require('./CreateRouter'),
    // Logging
    Logger = require('./logger'),

    // Session and cookie info
    sessionSecret = process.env.SESSION_SECRET || 'DoNotUseThisInProduction',
    expressSession = require('express-session'),
    cookieParser = require('cookie-parser'),

    // Shared constants
    hash = require('../client/sha512').hex_sha512,
    CONSTANTS = require(__dirname + '/../common/Constants');

var BASE_CLASSES = [
    SocketManager
];
var Server = function(opts) {
    this._logger = new Logger('NetsBlox');
    SocketManager.call(this, this._logger);
    this.opts = _.extend({}, DEFAULT_OPTIONS, opts);
    this.app = express();

    // Mongo variables
    this._users = null;
    this._server = null;

    // Mailer
    transporter.use('compile', markdown());

    // Group and RPC Managers
    this.rpcManager = new RPCManager(this._logger, this);
    this.mobileManager = new MobileManager(transporter);
};

_.extend(Server.prototype, SocketManager.prototype);

Server.prototype.connectToMongo = function(callback) {
    MongoClient.connect(this.opts.mongoURI, (err, db) => {
        if (err) {
            throw err;
        }

        this._users = db.collection('users');
        this.onDatabaseConnected();
        this.configureRoutes();

        console.log('Connected to '+this.opts.mongoURI);
        callback(err);
    });
};

Server.prototype.configureRoutes = function() {
    this.app.use(express.static(__dirname + '/../client/'));
    this.app.use(bodyParser.urlencoded({
        extended: true
    }));
    this.app.use(bodyParser.json());

    // Session & Cookie settings
    this.app.use(cookieParser());
    this.app.use(expressSession({secret: sessionSecret}));

    // CORS
    this.app.use(function(req, res, next) {
      res.header("Access-Control-Allow-Origin", "*");
      res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
      next();
    });

    // Add routes
    this.app.use('/rpc', this.rpcManager.router);
    this.app.use('/api', createRouter.call(this));

    // Initial page
    this.app.get('/', function(req, res) {
        res.redirect('/snap.html');
    });
};

Server.prototype.emailPassword = function(user, password) {
    transporter.sendMail({
        from: 'no-reply@netsblox.com',
        to: user.email,
        subject: 'Temporary Password',
        markdown: 'Hello '+user.username+',\nYour NetsBlox password has been '+
            'temporarily set to '+password+'. Please change it after '+
            'logging in.'
    });
};

Server.prototype.onDatabaseConnected = function() {
    // TODO: Add the ghost user if it doesn't exist
    // Check for the ghost user
    var username = CONSTANTS.GHOST.USER,
        password = CONSTANTS.GHOST.PASSWORD,
        email = CONSTANTS.GHOST.EMAIL;
    this._users.findOne({username: username}, (e, user) => {
        if (e) {
            return this._logger.log('Error:', e);
        }
        if (!user) {
            // Create the user with the given username, email, password
            var newUser = {username: username, 
                           email: email,
                           hash: hash(password),
                           projects: []};

            this.emailPassword(newUser, password);
            this._users.insert(newUser, (err, result) => {
                if (err) {
                    return this._logger.log('Error:', err);
                }
                this._logger.log('Created ghost user.');
            });
        } else {
            // Set the password
            this._users.update({username: username}, {$set: {hash: hash(password)}}, (e, data) => {
                var result = data.result;

                if (result.nModified === 0 || e) {
                    return this._logger.log('Could not set password for ghost user');
                }

                // Email the user the temporary password
                this.emailPassword(user, password);
            });
        }
    });
};

Server.prototype.start = function(done) {
    var self = this;
    done = done || Utils.nop;
    self.connectToMongo(function (err) {
        self._server = self.app.listen(self.opts.port, function() {
            SocketManager.prototype.start.call(self, {server: self._server});
            // Enable Vantage
            if (self.opts.vantage) {
                new Vantage(self).start();
            }
            done();
        });
    });
};

Server.prototype.stop = function(done) {
    done = done || Utils.nop;
    SocketManager.prototype.stop.call(this);
    this._server.close(done);
};

module.exports = Server;

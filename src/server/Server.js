'use strict';
var express = require('express'),
    bodyParser = require('body-parser'),
    _ = require('lodash'),
    Utils = _.extend(require('./Utils'), require('./ServerUtils.js')),
    CommunicationManager = require('./groups/CommunicationManager'),
    RPCManager = require('./rpc/RPCManager'),
    MongoClient = require('mongodb').MongoClient,
    Vantage = require('./Vantage'),
    DEFAULT_OPTIONS = {
        port: 8080,
        path: '',
        mongoURI: 'mongodb://localhost:27017'
    },

    // Mailer
    nodemailer = require('nodemailer'),
    transporter = nodemailer.createTransport(),  // TODO: Change to smtp

    // Routes
    createRouter = require('./CreateRouter'),
    // Logging
    debug = require('debug'),
    log = debug('NetsBlox:API:log'),
    info = debug('NetsBlox:API:info'),

    // Session and cookie info
    sessionSecret = process.env.SESSION_SECRET || 'DoNotUseThisInProduction',
    expressSession = require('express-session'),
    cookieParser = require('cookie-parser');

var Server = function(opts) {
    opts = _.extend({}, DEFAULT_OPTIONS, opts);
    this._port = opts.port;
    this.app = express();

    // Mongo variables
    this._users = null;
    this._server = null;
    this._mongoURI = opts.mongoURI;

    // Group and RPC Managers
    this.groupManager = new CommunicationManager(opts);
    this.rpcManager = new RPCManager(this.groupManager);

};

Server.prototype.connectToMongo = function(callback) {
    MongoClient.connect(this._mongoURI, function(err, db) {
        if (err) {
            throw err;
        }

        this._users = db.collection('users');
        this.configureRoutes();

        console.log('Connected to '+this._mongoURI);
        callback(err);
    }.bind(this));
};

Server.prototype.configureRoutes = function() {
    this.app.use(express.static(__dirname + '/../client/'));
    this.app.use(bodyParser.json());
    this.app.use(bodyParser.urlencoded({
        extended: true
    }));

    // Session & Cookie settings
    this.app.use(cookieParser());
    this.app.use(expressSession({secret: sessionSecret}));

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
        text: 'Hello '+user.username+',\nYour NetsBlox password has been '+
            'temporarily set to '+password+'. Please change it after '+
            'logging in.'
    });
};

Server.prototype.start = function(done) {
    done = done || Utils.nop;
    this.connectToMongo(function (err) {
        this._server = this.app.listen(this._port, done);
        this.groupManager.start();
        // Enable Vantage
        new Vantage(this).start();
    }.bind(this));
};

Server.prototype.stop = function(done) {
    done = done || Utils.nop;
    this.groupManager.stop();
    this._server.close(done);
};

module.exports = Server;

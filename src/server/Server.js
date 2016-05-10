'use strict';
var express = require('express'),
    bodyParser = require('body-parser'),
    _ = require('lodash'),
    Utils = _.extend(require('./Utils'), require('./ServerUtils.js')),
    SocketManager = require('./SocketManager'),
    RoomManager = require('./rooms/RoomManager'),
    RPCManager = require('./rpc/RPCManager'),
    MobileManager = require('./mobile/MobileManager'),
    Storage = require('./storage/Storage'),
    Vantage = require('./vantage/Vantage'),
    DEFAULT_OPTIONS = {
        port: 8080,
        vantagePort: 1234,
        vantage: true
    },

    // Mailer
    nodemailer = require('nodemailer'),
    markdown = require('nodemailer-markdown').markdown,
    transporter = nodemailer.createTransport(),  // TODO: Change to smtp

    // Routes
    createRouter = require('./CreateRouter'),
    path = require('path'),
    // Logging
    Logger = require('./logger'),

    // Session and cookie info
    cookieParser = require('cookie-parser');

var BASE_CLASSES = [
    SocketManager,
    RoomManager
];
var Server = function(opts) {
    this._logger = new Logger('NetsBlox');
    this.opts = _.extend({}, DEFAULT_OPTIONS, opts);
    this.app = express();

    // Mailer
    transporter.use('compile', markdown());

    // Mongo variables
    opts.transporter = transporter;
    this.storage = new Storage(this._logger, opts);
    this._server = null;

    // Group and RPC Managers
    this.rpcManager = new RPCManager(this._logger, this);
    this.mobileManager = new MobileManager(transporter);

    BASE_CLASSES.forEach(BASE => BASE.call(this, this._logger));
};

// Inherit from all the base classes
var classes = [Server].concat(BASE_CLASSES).map(fn => fn.prototype);
_.extend.apply(null, classes);

Server.prototype.configureRoutes = function() {
    this.app.use(express.static(__dirname + '/../client/'));
    this.app.use(bodyParser.urlencoded({
        extended: true
    }));
    this.app.use(bodyParser.json());

    // Session & Cookie settings
    this.app.use(cookieParser());

    // CORS
    this.app.use(function(req, res, next) {
        var origin = req.get('origin'),
            validOrigins = /^(https?:\/\/(?:.+\.)?netsblox\.org(?::\d{1,5})?)$/;

        if (validOrigins.test(origin) || process.env.ENV === 'local-dev') {
            res.header("Access-Control-Allow-Origin", origin);
            res.header('Access-Control-Allow-Credentials', true);
        }
        res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
        next();
    });

    // Add routes
    this.app.use('/rpc', this.rpcManager.router);
    createRouter.init(this._logger);
    this.app.use('/api', createRouter.call(this));

    // Initial page
    this.app.get('/', function(req, res) {
        res.sendFile(path.join(__dirname, '..', 'client', 'netsblox.html'));
    });
};

Server.prototype.start = function(done) {
    var self = this;
    done = done || Utils.nop;
    self.storage.connect(function (err) {
        if (err) {
            return done(err);
        }
        self.configureRoutes();
        self._server = self.app.listen(self.opts.port, function(err) {
            console.log('listening on port ' + self.opts.port);
            SocketManager.prototype.start.call(self, {server: self._server});
            // Enable Vantage
            if (self.opts.vantage) {
                new Vantage(self).start(self.opts.vantagePort);
            }
            done(err);
        });
    });
};

Server.prototype.stop = function(done) {
    done = done || Utils.nop;
    SocketManager.prototype.stop.call(this);
    this._server.close(done);
};

module.exports = Server;

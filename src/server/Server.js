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

    // Routes
    path = require('path'),
    fs = require('fs'),
    // Logging
    Logger = require('./logger'),

    // Session and cookie info
    cookieParser = require('cookie-parser');

var Server = function(opts) {
    this._logger = new Logger('NetsBlox');
    this.opts = _.extend({}, DEFAULT_OPTIONS, opts);
    this.app = express();

    // Mongo variables
    this.storage = new Storage(this._logger, opts);
    this._server = null;

    // Group and RPC Managers
    this.rpcManager = RPCManager;
    RoomManager.init(this._logger, this.storage);
    SocketManager.init(this._logger, this.storage);

    this.mobileManager = new MobileManager();
};

Server.prototype.configureRoutes = function() {
    this.app.use(express.static(__dirname + '/../client/'));
    this.app.use(bodyParser.urlencoded({
        limit: '50mb',
        extended: true
    }));
    this.app.use(bodyParser.json({limit: '50mb'}));

    // Session & Cookie settings
    this.app.use(cookieParser());

    // CORS
    this.app.use(function(req, res, next) {
        var origin = req.get('origin'),
            validOrigins = /^(https?:\/\/(?:.+\.)?netsblox\.org(?::\d{1,5})?)$/;

        if (validOrigins.test(origin) || process.env.ENV === 'local-dev') {
            res.header('Access-Control-Allow-Origin', origin);
            res.header('Access-Control-Allow-Credentials', true);
        }
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
        next();
    });

    // Add routes
    this.app.use('/rpc', this.rpcManager.router);
    this.app.use('/api', this.createRouter());

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
            SocketManager.start({server: self._server});
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
    SocketManager.stop();
    this._server.close(done);
};

Server.prototype.createRouter = function() {
    var router = express.Router({mergeParams: true}),
        logger = this._logger.fork('API'),
        middleware = require('./routes/middleware'),
        routes;

    // Load the routes from routes/
    routes = fs.readdirSync(path.join(__dirname, 'routes'))
        .filter(name => path.extname(name) === '.js')  // Only read js files
        .filter(name => name !== 'middleware.js')  // ignore middleware file
        .map(name => __dirname + '/routes/' + name)  // Create the file path
        .map(filePath => require(filePath))  // Load the routes
        .reduce((prev, next) => prev.concat(next), []);  // Merge all routes

    middleware.init(this);

    routes.forEach(api => {
        var method = api.Method.toLowerCase();
        api.URL = '/' + api.URL;
        logger.log(`adding "${method}" to ${api.URL}`);

        // Add the middleware
        if (api.middleware) {
            logger.trace(`adding "${method}" to ${api.URL}`);
            var args = api.middleware.map(name => middleware[name]);
            args.unshift(api.URL);
            router.use.apply(router, args);
        }

        router.route(api.URL)[method](api.Handler.bind(this));
    });
    return router;
};

module.exports = Server;

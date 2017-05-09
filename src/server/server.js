var express = require('express'),
    bodyParser = require('body-parser'),
    WebSocketServer = require('ws').Server,
    _ = require('lodash'),
    dot = require('dot'),
    xml2js = require('xml2js'),
    Q = require('q'),
    Utils = _.extend(require('./utils'), require('./server-utils.js')),
    SocketManager = require('./socket-manager'),
    RoomManager = require('./rooms/room-manager'),
    Collaboration = require('snap-collaboration'),
    RPCManager = require('./rpc/rpc-manager'),
    MobileManager = require('./mobile/mobile-manager'),
    Storage = require('./storage/storage'),
    EXAMPLES = require('./examples'),
    Vantage = require('./vantage/vantage'),
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
    cookieParser = require('cookie-parser'),
    indexTpl = dot.template(fs.readFileSync(path.join(__dirname, '..', 'client', 'netsblox.dot')));

var Server = function(opts) {
    this._logger = new Logger('netsblox');
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
    this.app.get('/debug.html', (req, res) =>
        res.sendFile(path.join(__dirname, '..', 'client', 'netsblox-dev.html')));

    this.app.get('/', (req, res) => {
        var baseUrl = `https://${req.get('host')}`,
            url = baseUrl + req.originalUrl,
            projectName = req.query.ProjectName,
            metaInfo = {
                googleAnalyticsKey: process.env.GOOGLE_ANALYTICS,
                url: url
            };


        if (req.query.action === 'present') {
            var username = req.query.Username;

            return this.storage.publicProjects.get(username, projectName)
                .then(project => {
                    if (project) {
                        metaInfo.image = {
                            url: baseUrl + encodeURI(`/api/projects/${project.owner}/${project.projectName}/thumbnail`),
                            width: 640,
                            height: 480
                        };
                        metaInfo.title = project.projectName;
                        metaInfo.description = project.notes;
                        this.addScraperSettings(req.headers['user-agent'], metaInfo);
                    }
                    return res.send(indexTpl(metaInfo));
                });
        } else if (req.query.action === 'example' && EXAMPLES[projectName]) {
            metaInfo.image = {
                url: baseUrl + encodeURI(`/api/examples/${projectName}/thumbnail`),
                width: 640,
                height: 480
            };
            metaInfo.title = projectName;
            var example = EXAMPLES[projectName];
            var role = Object.keys(example.roles).shift();
            var src = example.cachedProjects[role].SourceCode;
            return Q.nfcall(xml2js.parseString, src)
                .then(result => result.project.notes[0])
                .then(notes => {
                    metaInfo.description = notes;
                    this.addScraperSettings(req.headers['user-agent'], metaInfo);
                    return res.send(indexTpl(metaInfo));
                });
        }
        return res.send(indexTpl(metaInfo));
    });
};

Server.prototype.addScraperSettings = function(userAgent, metaInfo) {
    // fix the aspect ratio for facebook
    if (userAgent.includes('facebookexternalhit') || userAgent === 'Facebot') {
        metaInfo.image.url += '?aspectRatio=1.91';
    }
};

Server.prototype.start = function(done) {
    var opts = {};
    done = done || Utils.nop;

    opts.msgFilter = msg => !msg.namespace;

    return this.storage.connect()
        .then(() => {
            this.configureRoutes();
            this._server = this.app.listen(this.opts.port, err => {
                this._wss = new WebSocketServer({server: this._server});
                Collaboration.init(this._logger.fork('collaboration'));
                Collaboration.enable(this.app, this._wss, opts);
                SocketManager.enable(this._wss);
                // Enable Vantage
                if (this.opts.vantage) {
                    new Vantage(this).start(this.opts.vantagePort);
                }
                done(err);
            });
        });
};

Server.prototype.stop = function(done) {
    done = done || Utils.nop;
    this._wss.close();
    this._server.close(done);
};

Server.prototype.createRouter = function() {
    var router = express.Router({mergeParams: true}),
        logger = this._logger.fork('api'),
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

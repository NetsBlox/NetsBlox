var express = require('express'),
    bodyParser = require('body-parser'),
    qs = require('qs'),
    Q = require('q'),
    WebSocketServer = require('ws').Server,
    _ = require('lodash'),
    dot = require('dot'),
    Utils = _.extend(require('./utils'), require('./server-utils.js')),
    NetworkTopology = require('./network-topology'),
    RPCManager = require('./rpc/rpc-manager'),
    Storage = require('./storage/storage'),
    EXAMPLES = require('./examples'),
    Vantage = require('./vantage/vantage'),
    ENV = process.env.ENV,
    isDevMode = ENV !== 'production',
    DEFAULT_OPTIONS = {
        port: 8080,
        vantagePort: 1234,
        vantage: isDevMode
    },

    // Routes
    path = require('path'),
    fs = require('fs'),
    // Logging
    Logger = require('./logger'),

    // Session and cookie info
    cookieParser = require('cookie-parser');

const CLIENT_ROOT = path.join(__dirname, '..', 'browser');
const indexTpl = dot.template(fs.readFileSync(path.join(CLIENT_ROOT, 'index.dot')));
const middleware = require('./routes/middleware');
const Client = require('./client');

var Server = function(opts) {
    this._logger = new Logger('netsblox');
    this.opts = _.extend({}, DEFAULT_OPTIONS, opts);
    this.app = express();
    this.app.set('query parser', string => {
        return qs.parse(string);
    });

    this._server = null;

    // Group and RPC Managers
    NetworkTopology.init(this._logger, Client);
};

Server.prototype.configureRoutes = async function() {
    this.app.use(express.static(__dirname + '/../browser/'));
    this.app.use(bodyParser.urlencoded({
        limit: '50mb',
        extended: true
    }));
    this.app.use(bodyParser.json({limit: '50mb'}));

    // Session & Cookie settings
    this.app.use(cookieParser());

    // CORS
    this.app.use(function(req, res, next) {
        res.header('Access-Control-Allow-Origin', req.get('origin'));
        res.header('Access-Control-Allow-Methods', 'PUT, GET, POST, DELETE, PATCH');
        res.header('Access-Control-Allow-Credentials', true);
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, SESSIONGLUE');
        res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, PUT, PATCH, DELETE');
        next();
    });

    // Add routes
    this.app.use('/api', this.createRouter());

    // Add deployment state endpoint info
    const stateEndpoint = process.env.STATE_ENDPOINT || 'state';

    this.app.get(`/${stateEndpoint}/sockets`, function(req, res) {
        const sockets = NetworkTopology.sockets().map(socket => {
            return {
                clientId: socket.uuid,
                username: socket.username,
                projectId: socket.projectId,
                roleId: socket.roleId
            };
        });

        res.json(sockets);
    });

    // Initial page
    this.app.get('/', middleware.noCache, (req, res) => {
        return middleware.setUsername(req, res).then(() => {
            var baseUrl = `${process.env.SERVER_PROTOCOL || req.protocol}://${req.get('host')}`,
                url = baseUrl + req.originalUrl,
                projectName = req.query.ProjectName,
                metaInfo = {
                    title: 'NetsBlox',
                    username: req.session.username,
                    isDevMode: isDevMode,
                    googleAnalyticsKey: process.env.GOOGLE_ANALYTICS,
                    clientId: Utils.getNewClientId(),
                    baseUrl,
                    url: url
                };


            if (req.query.action === 'present') {
                var username = req.query.Username;

                return Storage.publicProjects.get(username, projectName)
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

                return example.getRoleNames()
                    .then(names => example.getRole(names.shift()))
                    .then(content => {
                        const src = content.SourceCode;
                        const startIndex = src.indexOf('<notes>');
                        const endIndex = src.indexOf('</notes>');
                        const notes = src.substring(startIndex + 7, endIndex);

                        metaInfo.description = notes;
                        this.addScraperSettings(req.headers['user-agent'], metaInfo);
                        return res.send(indexTpl(metaInfo));
                    });
            }
            return res.send(indexTpl(metaInfo));
        });
    });

    // Import Service Endpoints:
    await RPCManager.initialize();
    this.app.use(
        '/rpc',
        (req, res, next) => middleware.tryLogIn(req, res, next, true),
        RPCManager.router
    );
    var RPC_ROOT = path.join(__dirname, 'rpc', 'libs'),
        RPC_INDEX = fs.readFileSync(path.join(RPC_ROOT, 'RPC'), 'utf8')
            .split('\n')
            .filter(line => {
                var parts = line.split('\t'),
                    deps = parts[2] ? parts[2].split(' ') : [],
                    displayName = parts[1];

                // Check if we have loaded the dependent rpcs
                for (var i = deps.length; i--;) {
                    if (!RPCManager.isServiceLoaded(deps[i])) {
                        // eslint-disable-next-line no-console
                        console.log(`Service ${displayName} not available because ${deps[i]} is not loaded`);
                        return false;
                    }
                }
                return true;
            })
            .map(line => line.split('\t').splice(0, 2).join('\t'))
            .join('\n');

    this.app.get('/rpc/:filename', (req, res) => {
        var RPC_ROOT = path.join(__dirname, 'rpc', 'libs');

        // IF requesting the RPC file, filter out unsupported rpcs
        if (req.params.filename === 'RPC') {
            res.send(RPC_INDEX);
        } else {
            res.sendFile(path.join(RPC_ROOT, req.params.filename));
        }

    });

    this.app.get('/Examples/EXAMPLES', (req, res) => {
        // if no name requested, get index
        Q(this.getExamplesIndex(req.query.metadata === 'true'))
            .then(result => {
                const isJson = req.query.metadata === 'true';
                if (isJson) {
                    res.json(result);
                } else {
                    res.send(result);
                }
            });
    });

    this.app.get('/Examples/:name', (req, res) => {
        let name = req.params.name,
            isPreview = req.query.preview,
            example;

        if (!EXAMPLES.hasOwnProperty(name)) {
            this._logger.warn(`ERROR: Could not find example "${name}`);
            return res.status(500).send('ERROR: Could not find example.');
        }

        // This needs to...
        //  + create the room for the socket
        example = _.cloneDeep(EXAMPLES[name]);
        var role,
            room;

        if (!isPreview) {
            return res.send(example.toString());
        } else {
            room = example;
            //  + customize and return the room for the socket
            room = _.extend(room, example);
            role = Object.keys(room.roles).shift();
        }

        return room.getRole(role)
            .then(content => res.send(content.SourceCode));
    });

};

Server.prototype.getExamplesIndex = function(withMetadata) {
    let examples;

    if (withMetadata) {
        examples = Object.keys(EXAMPLES)
            .map(name => {
                let example = EXAMPLES[name],
                    role = Object.keys(example.roles).shift(),
                    primaryRole,
                    services = example.services,
                    thumbnail,
                    notes;

                // There should be a faster way to do this if all I want is the thumbnail and the notes...
                return example.getRole(role)
                    .then(content => {
                        primaryRole = content.SourceCode;
                        thumbnail = Utils.xml.thumbnail(primaryRole);
                        notes = Utils.xml.notes(primaryRole);

                        return example.getRoleNames();
                    })
                    .then(roleNames => {
                        return {
                            projectName: name,
                            primaryRoleName: role,
                            roleNames: roleNames,
                            thumbnail: thumbnail,
                            notes: notes,
                            services: services
                        };
                    });
            });

        return Q.all(examples);
    } else {
        return Object.keys(EXAMPLES)
            .map(name => `${name}\t${name}\t  `)
            .join('\n');
    }
};

Server.prototype.addScraperSettings = function(userAgent, metaInfo) {
    // fix the aspect ratio for facebook
    if (userAgent.includes('facebookexternalhit') || userAgent === 'Facebot') {
        metaInfo.image.url += '?aspectRatio=1.91';
    }
};

Server.prototype.start = async function() {
    var opts = {};

    opts.msgFilter = msg => !msg.namespace;

    await Storage.connect();
    if (ENV === 'test') {
        const fixtures = require('../../test/fixtures');
        if (/test/.test(Storage._db.databaseName)) {
            // eslint-disable-next-line no-console
            console.log('resetting the database');
            await Storage._db.dropDatabase();
            await fixtures.init(Storage);
        } else {
            // eslint-disable-next-line no-console
            console.warn('skipping database reset, test database should have the word test in the name.');
        }
    }
    await this.configureRoutes();
    this._server = this.app.listen(this.opts.port);
    // eslint-disable-next-line no-console
    console.log(`listening on port ${this.opts.port}`);

    // Enable the websocket handling
    this._wss = new WebSocketServer({server: this._server});
    this._wss.on('connection', (socket, req) => {
        socket.upgradeReq = req;
        const client = new Client(this._logger, socket);
        NetworkTopology.onConnect(client);
    });

    // Enable Vantage
    if (this.opts.vantage) {
        new Vantage(this).start(this.opts.vantagePort);
    }
};

Server.prototype.stop = function(done) {
    done = done || Utils.nop;
    this._wss.close();
    this._server.close(done);
};

// Load the routes from routes/ dir
function loadRoutes(logger) {
    // load server routes
    const serverRoutes = fs.readdirSync(path.join(__dirname, 'routes'))
        .filter(name => path.extname(name) === '.js')  // Only read js files
        .filter(name => name !== 'middleware.js')  // ignore middleware file
        .map(name => __dirname + '/routes/' + name)  // Create the file path
        .map(filePath => {
            logger.trace('about to load ' + filePath);
            return require(filePath);
        })  // Load the routes
        .reduce((prev, next) => prev.concat(next), []);  // Merge all routes

    // load service routes
    const serviceRoutes = fs.readdirSync(path.join(__dirname, 'rpc/procedures'))
        .filter(serviceDir => { // check if it has a routes file
            return fs.readdirSync(path.join(__dirname, `rpc/procedures/${serviceDir}`))
                .includes('routes.js');
        })
        .map(serviceDir => __dirname + `/rpc/procedures/${serviceDir}/routes.js`)
        .map(filePath => {
            logger.trace('about to load service route ' + filePath);
            return require(filePath);
        })  // Load the routes
        .reduce((prev, next) => prev.concat(next), []);  // Merge all routes

    const routes = [...serverRoutes, ...serviceRoutes];

    return routes;
}

Server.prototype.createRouter = function() {
    var router = express.Router({mergeParams: true}),
        logger = this._logger.fork('api');

    const routes = loadRoutes(logger);

    middleware.init(this);

    logger.trace('loading API routes');
    routes.forEach(api => {
        var method = api.Method.toLowerCase();
        api.URL = '/' + api.URL;

        // Add the middleware
        if (api.middleware && api.middleware.length > 0) {
            var args = api.middleware.map(name => (req, res, next) => {
                if (req.method === 'OPTIONS') return next();
                return middleware[name](req, res, next);
            });
            args.unshift(api.URL);
            router.use.apply(router, args);
        }

        router.route(api.URL)[method]((req, res) => {
            if (api.Service) {
                const args = (api.Parameters || '').split(',')
                    .map(name => {
                        let content = req.body[name] || 'undefined';
                        content = content.length < 50 ? content : '<omitted>';
                        return `${name}: "${content}"`;
                    })
                    .join(', ');
                logger.trace(`received request ${api.Service}(${args})`);
            }
            try {
                const result = api.Handler.call(this, req, res);
                if (result && result.then) {
                    result.catch(err => {
                        logger.error(`error occurred in ${api.URL}:`, err);
                        res.status(500).send(err.message);
                    });
                }
            } catch (err) {
                logger.error(`error occurred in ${api.URL}:`, err);
                res.status(500).send(err.message);
            }
        });
    });
    return router;
};

module.exports = Server;

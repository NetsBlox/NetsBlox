var express = require('express'),
    bodyParser = require('body-parser'),
    qs = require('qs'),
    Q = require('q'),
    WebSocketServer = require('ws').Server,
    _ = require('lodash'),
    dot = require('dot'),
    Utils = _.extend(require('./utils'), require('./server-utils.js')),
    SocketManager = require('./socket-manager'),
    RoomManager = require('./rooms/room-manager'),
    RPCManager = require('./rpc/rpc-manager'),
    Storage = require('./storage/storage'),
    EXAMPLES = require('./examples'),
    Vantage = require('./vantage/vantage'),
    isDevMode = process.env.ENV !== 'production',
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

    SERVER_NAME = process.env.SERVER_NAME || 'netsblox',

    // Session and cookie info
    cookieParser = require('cookie-parser');

const CLIENT_ROOT = path.join(__dirname, '..', 'browser');
const indexTpl = dot.template(fs.readFileSync(path.join(CLIENT_ROOT, 'index.dot')));
const middleware = require('./routes/middleware');

var Server = function(opts) {
    this._logger = new Logger('netsblox');
    this.opts = _.extend({}, DEFAULT_OPTIONS, opts);
    this.app = express();
    this.app.set('query parser', string => {
        return qs.parse(string, {parameterLimit: 10000, arrayLimit: 20000});
    });

    // Mongo variables
    this.storage = new Storage(this._logger, opts);
    this._server = null;

    // Group and RPC Managers
    this.rpcManager = RPCManager;
    RoomManager.init(this._logger, this.storage);
    SocketManager.init(this._logger, this.storage);
};

Server.prototype.configureRoutes = function() {
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
        res.header('Access-Control-Allow-Credentials', true);
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, SESSIONGLUE');
        next();
    });

    // Add routes
    this.app.use('/rpc', this.rpcManager.router);
    this.app.use('/api', this.createRouter());

    // Add deployment state endpoint info
    const stateEndpoint = process.env.STATE_ENDPOINT || 'state';
    this.app.get(`/${stateEndpoint}/rooms`, function(req, res) {
        const rooms = RoomManager.getActiveRooms();
        return res.json(rooms.map(room => {
            const roles = {};
            const project = room.getProject();
            let lastUpdatedAt = null;

            if (project) {
                lastUpdatedAt = new Date(project.lastUpdatedAt);
            }

            room.getRoleNames().forEach(role => {
                roles[role] = room.getSocketsAt(role).map(socket => {
                    return {
                        username: socket.username,
                        uuid: socket.uuid
                    };
                });
            });

            return {
                uuid: room.uuid,
                name: room.name,
                owner: room.owner,
                collaborators: room.getCollaborators(),
                lastUpdatedAt: lastUpdatedAt,
                roles: roles
            };
        }));
    });

    this.app.get(`/${stateEndpoint}/sockets`, function(req, res) {
        const sockets = SocketManager.sockets().map(socket => {
            const room = socket.getRoomSync();
            const roomName = room && Utils.uuid(room.owner, room.name);

            return {
                uuid: socket.uuid,
                username: socket.username,
                room: roomName,
                role: socket.role
            };
        });

        res.json(sockets);
    });

    // Initial page
    this.app.get('/', (req, res) => {
        return middleware.setUsername(req, res).then(() => {
            var baseUrl = `${process.env.SERVER_PROTOCOL || req.protocol}://${req.get('host')}`,
                url = baseUrl + req.originalUrl,
                projectName = req.query.ProjectName,
                metaInfo = {
                    title: 'NetsBlox',
                    username: req.session.username,
                    isDevMode: isDevMode,
                    googleAnalyticsKey: process.env.GOOGLE_ANALYTICS,
                    clientId: this.getNewClientId(),
                    baseUrl,
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
    var RPC_ROOT = path.join(__dirname, 'rpc', 'libs'),
        RPC_INDEX = fs.readFileSync(path.join(RPC_ROOT, 'RPC'), 'utf8')
            .split('\n')
            .filter(line => {
                var parts = line.split('\t'),
                    deps = parts[2] ? parts[2].split(' ') : [],
                    displayName = parts[1];

                // Check if we have loaded the dependent rpcs
                for (var i = deps.length; i--;) {
                    if (!RPCManager.isRPCLoaded(deps[i])) {
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

Server.prototype.getNewClientId = function() {
    return '_' + SERVER_NAME + Date.now();
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

Server.prototype.start = function(done) {
    var opts = {};
    done = done || Utils.nop;

    opts.msgFilter = msg => !msg.namespace;

    return this.storage.connect()
        .then(() => {
            this.configureRoutes();
            this._server = this.app.listen(this.opts.port, err => {
                if (err) {
                    return done(err);
                }

                // eslint-disable-next-line no-console
                console.log(`listening on port ${this.opts.port}`);
                this._wss = new WebSocketServer({server: this._server});
                SocketManager.enable(this._wss);
                // Enable Vantage
                if (this.opts.vantage) {
                    new Vantage(this).start(this.opts.vantagePort);
                }
                done();
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
        routes;

    // Load the routes from routes/
    routes = fs.readdirSync(path.join(__dirname, 'routes'))
        .filter(name => path.extname(name) === '.js')  // Only read js files
        .filter(name => name !== 'middleware.js')  // ignore middleware file
        .map(name => __dirname + '/routes/' + name)  // Create the file path
        .map(filePath => {
            logger.trace('about to load ' + filePath);
            return require(filePath);
        })  // Load the routes
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

        router.route(api.URL)[method]((req, res) => {
            if (api.Service) {
                logger.trace(`received ${api.Service} request`);
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

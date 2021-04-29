var express = require('express'),
    bodyParser = require('body-parser'),
    qs = require('qs'),
    Q = require('q'),
    WebSocketServer = require('ws').Server,
    _ = require('lodash'),
    dot = require('dot'),
    Utils = _.extend(require('./utils'), require('./server-utils.js')),
    NetworkTopology = require('./network-topology'),
    Storage = require('./storage/storage'),
    EXAMPLES = require('./examples'),
    Vantage = require('./vantage/vantage'),
    ENV = process.env.ENV,
    isDevMode = ENV !== 'production',
    DEFAULT_OPTIONS = {
        port: 8080,
        vantagePort: 1234,
        vantage: isDevMode,
    },

    // Routes
    path = require('path'),
    fs = require('fs'),
    // Logging
    Logger = require('./logger'),

    // Session and cookie info
    cookieParser = require('cookie-parser');

const {RequestError} = require('./api/core/errors');
const CLIENT_ROOT = path.join(__dirname, '..', 'browser');
const indexTpl = dot.template(fs.readFileSync(path.join(CLIENT_ROOT, 'index.dot')));
const middleware = require('./routes/middleware');
const Client = require('./client');
const Messages = require('./services/messages');
const assert = require('assert');
const request = require('request');
const CustomServicesHosts = require('./api/core/services-hosts');
const RestAPI = require('./api/rest');

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

Server.prototype.configureRoutes = async function(servicesURL) {
    this.app.use(express.static(__dirname + '/../browser/'));

    // Session & Cookie settings
    this.app.use(cookieParser());

    this.app.use(bodyParser.urlencoded({
        limit: '50mb',
        extended: true
    }));
    this.app.use(bodyParser.json({limit: '50mb'}));

    // CORS
    this.app.use(function(req, res, next) {
        res.header('Access-Control-Allow-Origin', req.get('origin'));
        res.header('Access-Control-Allow-Credentials', true);
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, SESSIONGLUE');
        res.header('Access-Control-Allow-Methods', 'POST, GET, OPTIONS, PUT, PATCH, DELETE');
        next();
    });

    // Add routes
    this.app.use('/api', this.createRouter());
    RestAPI(this.app);
    if (servicesURL) {
        this.app.use('/services', (req, res) => {
            const url = servicesURL + req.originalUrl.replace('/services', '');
            const proxyReq = request({
                method: req.method,
                uri: url,
                body: req.body,
                headers: req.headers,
                json: true,
            });
            proxyReq.on('error', err => {
                this._logger.warn(`Error occurred on call to ${url}: ${err}`);
                res.sendStatus(500);
            });
            return proxyReq.pipe(res);
        });
    }


    // Add deployment state endpoint info
    const stateEndpoint = process.env.STATE_ENDPOINT || 'state';

    this.app.get(`/${stateEndpoint}/sockets`, function(req, res) {
        const now = Date.now();
        const clients = NetworkTopology.clients().map(client => {
            return {
                clientId: client.uuid,
                username: client.username,
                projectId: client.projectId,
                roleId: client.roleId,
                secsSinceLastActivity: (now - client.lastSocketActivity)/1000,
            };
        });

        res.json(clients);
    });

    // Initial page
    this.app.get('/', middleware.noCache, async (req, res) => {
        await middleware.setUsername(req, res);
        const {username} = req.session;
        const servicesHosts = username ? await CustomServicesHosts.getServicesHosts(username, username) : [];
        const defaultServicesUrl = this.getPublicServicesUrl();
        if (defaultServicesUrl) {
            servicesHosts.unshift({
                categories: [],
                url: defaultServicesUrl
            });
        }

        const baseUrl = `${process.env.SERVER_PROTOCOL || req.protocol}://${req.get('host')}`,
            url = baseUrl + req.originalUrl,
            projectName = req.query.ProjectName,
            metaInfo = {
                title: 'NetsBlox',
                username: req.session.username,
                isDevMode: isDevMode,
                googleAnalyticsKey: process.env.GOOGLE_ANALYTICS,
                clientId: Utils.getNewClientId(),
                servicesHosts,
                baseUrl,
                url,
            };


        if (req.query.action === 'present') {
            const owner = req.query.Username;

            const project = await Storage.projects.getPublicProject(owner, projectName);
            if (project) {
                metaInfo.image = {
                    url: baseUrl + encodeURI(`/api/projects/${project.owner}/${project.name}/thumbnail`),
                    width: 640,
                    height: 480
                };
                metaInfo.title = project.name;
                metaInfo.description = project.notes;
                const userAgent = req.headers['user-agent'];
                if (userAgent) {
                    this.addScraperSettings(userAgent, metaInfo);
                }
            }
            return res.send(indexTpl(metaInfo));
        } else if (req.query.action === 'example' && EXAMPLES[projectName]) {
            metaInfo.image = {
                url: baseUrl + encodeURI(`/api/examples/${projectName}/thumbnail`),
                width: 640,
                height: 480
            };
            metaInfo.title = projectName;
            var example = EXAMPLES[projectName];

            const names = await example.getRoleNames();
            const content = await example.getRole(names.shift());
            const src = content.SourceCode;
            const startIndex = src.indexOf('<notes>');
            const endIndex = src.indexOf('</notes>');
            const notes = src.substring(startIndex + 7, endIndex);

            metaInfo.description = notes;
            const userAgent = req.headers['user-agent'];
            if (userAgent) {
                this.addScraperSettings(userAgent, metaInfo);
            }
            return res.send(indexTpl(metaInfo));
        }
        return res.send(indexTpl(metaInfo));
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
        //  + create the room for the client
        example = _.cloneDeep(EXAMPLES[name]);
        var role,
            room;

        if (!isPreview) {
            return res.send(example.toString());
        } else {
            room = example;
            //  + customize and return the room for the client
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

Server.prototype.start = async function(seedDatabase=ENV === 'test') {
    await Storage.connect();
    if (seedDatabase) {
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
    await this.configureRoutes(this.opts.servicesURL);
    this.app.use('/docs', express.static(path.join(__dirname, 'docs', '_generated', '_build', 'html')));
    this._server = this.app.listen(this.opts.port);
    // eslint-disable-next-line no-console
    console.log(`listening on port ${this.opts.port}`);

    // Enable the websocket handling
    this._wss = new WebSocketServer({server: this._server});
    this._wss.on('connection', (socket, req) => {
        socket.upgradeReq = req;
        socket.once('message', data => {
            const {type, clientId} = JSON.parse(data);
            if (type !== 'set-uuid') {
                this._logger.warn(`Invalid initial ws message: ${type}`);
                socket.close();
                return;
            }
            const client = NetworkTopology.onConnect(socket, clientId);
            client.send({type: 'connected'});
        });
    });
    const servicesApi = new ServicesPrivateAPI(this._logger);
    servicesApi.listen('tcp://127.0.0.1:' + (process.env.NETSBLOX_API_PORT || '1357'));

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
    const serviceRoutes = fs.readdirSync(path.join(__dirname, 'services', 'procedures'))
        .map(serviceDir => { // check if it has a routes file
            const absServiceDir = path.join(__dirname, 'services','procedures', serviceDir);
            const hasRoutes = fs.readdirSync(absServiceDir).includes('routes.js');
            if (hasRoutes) {
                const router = require(`./services/procedures/${serviceDir}/routes.js`);
                if (Array.isArray(router)) {
                    return router;
                }
            }
        })
        .filter(routes => routes)
        .flat();

    const routes = [...serverRoutes, ...serviceRoutes];

    return routes;
}

Server.prototype.getPublicServicesUrl = function() {
    if (this.opts.useServiceProxy) {
        return null;
    }

    return this.opts.servicesURL;
};

Server.prototype.createRouter = function() {
    var router = express.Router({mergeParams: true}),
        logger = this._logger.fork('api');

    const routes = loadRoutes(logger);

    middleware.init(this);

    logger.trace('loading API routes');
    routes.forEach(api => {
        const isRouter = !api.Method;
        if (isRouter) {
            router.use(api);
        } else {
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

            router.route(api.URL)[method](async (req, res) => {
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
                    await api.Handler.call(this, req, res);
                } catch (err) {
                    const statusCode = err instanceof RequestError ? 400 : 500;
                    res.status(statusCode).send(`ERROR: ${err.message}`);
                }
            });
        }
    });
    return router;
};

class ServicesPrivateAPI {
    constructor(logger) {
        const {Dealer} = require('zeromq');
        this.receiver = new Dealer();
        this.messageHandlers = {};
        this.logger = logger.fork('services');

        this.on(Messages.SendMessage, message => {
            const client = NetworkTopology.getClient(message.clientId);
            if (client) {
                const hasChangedSituation = message.projectId !== client.projectId ||
                    message.roleId !== client.roleId;

                if (!hasChangedSituation) {
                    client.sendMessage(message.type, message.contents);
                }
            } else {
                this.logger.warn(`Could not find client: ${message.clientId}`);
            }
        });
        this.on(Messages.SendMessageToRoom, message => {
            const {projectId, type, contents} = message;
            const clients = NetworkTopology.getClientsAtProject(projectId);
            clients.forEach(client => client.sendMessage(type, contents));
        });
        this.on(Messages.SendMessageToRole, message => {
            const {projectId, roleId, type, contents} = message;
            const clients = NetworkTopology.getClientsAt(projectId, roleId);
            clients.forEach(client => client.sendMessage(type, contents));
        });
    }

    on(msgClass, fn) {
        const typeName = msgClass.name;
        assert(Messages[typeName], 'Invalid Message Type: ' + typeName);
        if (!this.messageHandlers[typeName]) {
            this.messageHandlers[typeName] = [];
        }

        this.messageHandlers[typeName].push(fn);
    }

    async listen(address) {
        await this.receiver.bind(address);
        while (true) {
            const msgs = await this.receiver.receive();
            for (let i = 0; i < msgs.length; i++) {
                const message = Messages.parse(msgs[i]);
                const handlers = this.messageHandlers[message.getType()] || [];
                handlers.forEach(fn => fn(message));
            }
        }
    }
}

module.exports = Server;

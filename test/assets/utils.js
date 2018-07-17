/*global Client*/
const  _ = require('lodash');
const assert = require('assert');
const fixtures = require('../fixtures');

// load the *exact* XML_Serializer from Snap!... pretty hacky...
const path = require('path');
const fs = require('fs');
const Q = require('q');
const PROJECT_ROOT = path.join(__dirname, '..', '..');
const reqSrc = p => require(PROJECT_ROOT + '/src/server/' + p);

const ActiveRoom = require(PROJECT_ROOT + '/src/server/rooms/active-room');
const NetsBloxSocket = require(PROJECT_ROOT + '/src/server/rooms/netsblox-socket');
const Socket = require('./mock-websocket');
const Logger = require(PROJECT_ROOT + '/src/server/logger');
const Storage = require(PROJECT_ROOT + '/src/server/storage/storage');
const mainLogger = new Logger('netsblox:test');
const storage = new Storage(mainLogger);
const serverUtils = reqSrc('server-utils');
const Projects = reqSrc('storage/projects');

(function() {
    var clientDir = path.join(PROJECT_ROOT, 'src', 'browser'),
        srcFiles = ['morphic.js', 'xml.js', 'store.js', 'actions.js'],
        src;

    src = srcFiles
        .map(file => path.join(clientDir, file))
        .map(file => {
            var code = fs.readFileSync(file, 'utf8');
            if (file.includes('morphic.js')) {
                code = code
                    .split('// Morph')[0]
                    .split('// Global Functions')[1];
            }
        
            if (file.includes('store.js')) {  // remove the SnapSerializer stuff
                code = code.split('StageMorph.prototype.toXML')[0];
            }
            return code;
        })
        .join('\n');


    // expose the XML_Serializer
    src = [
        'modules = {};',
        'window = {location:{}};',
        'var CLIENT_ID, SERVER_URL;',
        'var SnapActions;',
        'var SnapCloud = {};',
        src,
        'global.Client = global.Client || {};',
        'global.Client.XML_Serializer = XML_Serializer;',
        'global.Client.SnapActions = SnapActions;'
    ].join('\n');
    eval(src);
})(this);

// Test loading of xml
const idBlocks = block => {
    block.attributes.collabId = 'testId';
    block.children.forEach(child => idBlocks(child));
    return block;
};

const parser = new Client.XML_Serializer();
const canLoadXml = string => {
    var xml;

    // Add a collabId and reserialize
    var res = Client.SnapActions.uniqueIdForImport(string);
    xml = res.toString();
    assert(parser.parse(xml));
};

// Create configured room helpers
let logger = new Logger('netsblox:test');
const createSocket = function(username) {
    const socket = new NetsBloxSocket(logger, new Socket());
    socket.uuid = `_netsblox${Date.now()}`;
    socket.username = username || socket.uuid;
    return socket;
};

const createRoom = function(config) {
    // Get the room and attach a project
    const room = new ActiveRoom(logger, config.name, config.owner);
    let attachProject = Q(room);
    
    if (config.owner) {
        const socket = createSocket(config.owner);
        attachProject = Projects.new(socket, room)
            .then(project => room.setStorage(project));
    }

    return attachProject
        .then(() => {
            const roleNames = Object.keys(config.roles);
            const createRoles = roleNames.reduce((promise, name) => {
                config.roles[name] = config.roles[name] || [];
                return promise
                    .then(() => room.silentCreateRole(name))
                    .then(() => {
                        const usernames = config.roles[name];
                        const addSockets = usernames.map(username => {
                            const socket = createSocket(username);
                            return room.silentAdd(socket, name);
                        });
                        return Q.all(addSockets);
                    });
            }, Q());

            return createRoles;
        })
        .then(() => {
            //  Add response capabilities
            room.sockets().forEach(socket => {
                socket._socket.addResponse('project-request', sendEmptyRole.bind(socket));
            });

            return room;
        });
};

const sendEmptyRole = function(msg) {
    return {
        type: 'project-response',
        id: msg.id,
        project: serverUtils.getEmptyRole(this.role)
    };
};

let connection = null;
const connect = function() {
    const mongoUri = 'mongodb://127.0.0.1:27017/netsblox-tests';
    if (!connection) {
        connection = storage.connect(mongoUri);
    }
    return connection;
};

const clearCache = function() {
    var args = Array.prototype.slice.call(arguments);
    args.forEach(arg => {
        try {
            let fullName = require.resolve(arg);
            delete require.cache[fullName];
        } catch(e) {
            throw `${arg}: ${e}`;
        }
    });
};

const reset = function() {
    let db = null;
    // TODO: load the seed data
    // Reload the server and the paths
    let routes = fs.readdirSync(path.join(__dirname, '..', '..', 'src', 'server', 'routes'))
        .map(file => `../../src/server/routes/${file}`);
    let modulesToRefresh = routes.concat('../../src/server/server');
    clearCache.apply(null, modulesToRefresh);

    return connect()
        .then(_db => db = _db)
        .then(() => db.dropDatabase())
        .then(() => fixtures.init(storage))
        .then(() => logger.info('Finished loading test fixtures!'))
        .then(() => storage._db);
};

const sleep = delay => {
    const deferred = Q.defer();
    setTimeout(deferred.resolve, delay);
    return deferred.promise;
};

module.exports = {
    verifyRPCInterfaces: function(rpc, interfaces) {
        describe(`${rpc.rpcName} interfaces`, function() {
            interfaces.forEach(interface => {
                var name = interface[0],
                    expected = interface[1] || [];

                it(`${name} args should be ${expected.join(', ')}`, function() {
                    var args = rpc.getArgumentsFor(name);
                    assert(_.isEqual(args, expected));
                });
            });
        });
    },
    XML_Serializer: Client.XML_Serializer,
    canLoadXml: canLoadXml,

    connect: connect,
    reset: reset,
    sleep: sleep,
    logger: mainLogger,
    createRoom: createRoom,
    createSocket: createSocket,
    sendEmptyRole: sendEmptyRole,

    reqSrc
};

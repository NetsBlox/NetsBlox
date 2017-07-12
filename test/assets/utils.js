/*global Client*/
const  _ = require('lodash');
const assert = require('assert');

// load the *exact* XML_Serializer from Snap!... pretty hacky...
const path = require('path');
const Q = require('q');
const fs = require('fs');
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

(function() {
    var clientDir = path.join(PROJECT_ROOT, 'src', 'client', 'Snap--Build-Your-Own-Blocks'),
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
        'var SnapActions;',
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
    const room = new ActiveRoom(logger, config.name, config.owner);

    Object.keys(config.roles).forEach(name => {
        config.roles[name] = config.roles[name] || [];
        room.silentCreateRole(name);
        config.roles[name].forEach(username => {
            const socket = createSocket(username);

            room.silentAdd(socket, name);
        });
    });

    return room;
};

const sendEmptyRole = function(msg) {
    return {
        type: 'project-response',
        id: msg.id,
        project: serverUtils.getEmptyRole(this.roleId)
    };
};

const connect = function() {
    const mongoUri = 'mongodb://127.0.0.1:27017/netsblox-tests';
    if (storage.connected) {
        return Q(storage._db);
    } else {
        return storage.connect(mongoUri);
    }
};

module.exports = {
    verifyRPCInterfaces: function(rpc, interfaces) {
        describe(`${rpc.getPath()} interfaces`, function() {
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
    logger: mainLogger,
    createRoom: createRoom,
    createSocket: createSocket,
    sendEmptyRole: sendEmptyRole,

    reqSrc
};

// A Game Type has a single paradigm instance which corresponds to some of the
// implicit rules of the game/app (eg, Two player, turn based, etc)
//
'use strict';

var BasicParadigm = require('./paradigms/Basic'),
    ParadigmInterface = Object.keys(BasicParadigm.prototype),
    debug = require('debug'),
    log,
    trace,
    DevParadigm = require('./paradigms/DevModeParadigm');

var GameType = function(name, paradigm) {
    log = debug('NetsBlox:CommunicationManager:GameType:'+name+':log');
    trace = debug('NetsBlox:CommunicationManager:GameType:'+name+':trace');

    this.name = name;
    this.devParadigm = new DevParadigm();
    this.paradigmInstance = paradigm;  // TODO: Load the paradigm instance from the name
    this.productionUuids = {};  // All of the socket uuids for projects actively used

    // Modify paradigmInstance to update productions uuids when onDisconnect invoked
    var self = this,
        onDisconnect = this.paradigmInstance.onDisconnect;

    this.paradigmInstance.onDisconnect = function(socket) {
        delete self.productionUuids[socket.uuid];
        onDisconnect.call(this, socket);
    };
};

/**
 * Get a list of all dev groups for the given user
 *
 * @param username
 * @return {undefined}
 */
GameType.prototype.getDevGroups = function(username) {
    return this.devParadigm.userGroups[username] || [];
};

// Create all the methods that will be forwarded to the paradigm instance
ParadigmInterface
    .filter(function(method) {
        return BasicParadigm.prototype[method].length > 0;
    })
    .forEach(function(method) {
        GameType.prototype[method] = function(socket, msg) {
            return this.getParadigmInstance(socket)[method](socket, msg);
        };
    });

// Override
// This is the only interface that has args and doesn't take a socket
GameType.prototype.onGroupClose = function(groupId) {
    // FIXME: 
    console.error('RECEIVED on group close for groupID');
};

GameType.prototype.getMemberCount = function(socket) {
    return this.getParadigmInstance(socket).memberCount;
};

GameType.prototype.getAllGroups = function() {
    return this.devParadigm.getAllGroups()
        .concat(this.paradigmInstance.getAllGroups());
};

// TODO: Listen for 'devMode' messages
// 'devMode on <username>'
// 'devMode off'
GameType.prototype.onMessage = function(socket, message) {
    var data = message.split(' '),
        type = data.shift();

    if (type === 'devMode') {  // Check for devMode messages
        switch (data[0]) {
            case 'on':
                trace('Moving ' + socket.uuid + ' to dev mode');
                data.shift();
                this.moveSocket(true, socket, data.join(' '));
                break;

            case 'off':
                trace('Moving ' + socket.uuid + ' to production mode');
                this.moveSocket(false, socket);
                break;

            default:
                log('Invalid devMode message: "' + message + '"');
                break;
        }
    } else {  // If none, forward to paradigm
        this.getParadigmInstance(socket).onMessage(socket, message);
    }
};

/* * * * * * Helper Functions* * * * * * */
/**
 * Get the paradigm instance or devParadigm.
 *
 * @private
 * @param {NetsBloxSocket} socket
 * @return {ParadigmInstance}
 */
GameType.prototype.getParadigmInstance = function(socket) {
    if (this.productionUuids[socket.uuid]) {
        return this.paradigmInstance;
    }
    return this.devParadigm;
};

GameType.prototype.moveSocket = function(toDev, socket, username) {
    var srcParadigm,
        dstParadigm;

    if (toDev) {
        srcParadigm = this.devParadigm;
        dstParadigm = this.paradigmInstance;
        delete this.productionUuids[socket.uuid];
    } else {
        srcParadigm = this.paradigmInstance;
        dstParadigm = this.devParadigm;
        this.productionUuids[socket.uuid] = socket;
    }

    srcParadigm.onConnect(socket);
    dstParadigm.onDisconnect(socket);
};

module.exports = GameType;

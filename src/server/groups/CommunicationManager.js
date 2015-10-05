// Communication Manager
// Handles the groups and websocket communication 

'use strict';

// Web Sockets
var WebSocketServer = require('ws').Server,
    NBSocket = require('./NetsBloxSocket'),
    GameType = require('./GameType'),
    GameTypes = require('../GameTypes'),
    Utils = require('../ServerUtils'),

    fs = require('fs'),
    R = require('ramda'),
    path = require('path'),

    GenericManager = require('./paradigms/UniqueRoleParadigm'),
    ParadigmManager = require('./ParadigmManager'),
    BroadcastInterface = require('./Broadcaster'),
    _ = require('lodash'),

    debug = require('debug'),
    log = debug('NetsBlox:CommunicationManager:log'),
    info = debug('NetsBlox:CommunicationManager:info'),
    trace = debug('NetsBlox:CommunicationManager:trace'),
    assert = require('assert'),

    HandleSocketRequest = require('./RequestTypes');

// Settings
var DEFAULT_GAME_TYPE = 'none',
    loadParadigms,
    Paradigms;

loadParadigms = function() {
    var paradigmDir = path.join(__dirname, 'paradigms'),
        result = {};

    Utils.loadJsFiles(paradigmDir)
        .map(function(Paradigm) {
            return Paradigm;
        })
        .forEach(function(Paradigm) {
            result[Paradigm.getName().toLowerCase()] = Paradigm;
        }, this);
    return result;
};

Paradigms = loadParadigms();

var CommunicationManager = function(opts) {
    this._wss = null;
    this.sockets = [];
    this.socket2Role = {};  // TODO: Move this to the UniqueRoleParadigm

    // These next two are for group id retrieval
    this.uuid2Socket = {};
    this.gameTypes = this.loadGameTypes();
    this.uuid2GameType = {};

    // Group close callbacks
    this._groupCloseListeners = [];
};

_.extend(CommunicationManager.prototype, BroadcastInterface);

/**
 * Start the WebSocket server and start the socket updating interval.
 *
 * @param {Object} opts
 * @return {undefined}
 */
CommunicationManager.prototype.start = function(options) {
    var self = this,
        uuid;

    self._wss = new WebSocketServer(options);
    info('WebSocket server started!');

    self._wss.on('connection', function(rawSocket) {
        var socket = self._prepSocket(rawSocket);

        // Set up event handlers
        rawSocket.on('message', function(data) {
            log('Received message: "'+data+ '" from', socket.uuid);
            self.onMsgReceived(socket, data);
        });

        rawSocket.on('close', function() {
            self.updateSocket(socket);
            info(socket.uuid+' closed!');
        });

    });
};

CommunicationManager.prototype.loadGameTypes = function() {
    var types = GameTypes.map(CommunicationManager.loadGameType),
        result = {};

    for (var i = types.length; i--;) {
        result[GameTypes[i].name.toLowerCase()] = types[i];
    }
    return result;
};

CommunicationManager.loadGameType = function(description) {
    var name = description.name,
        paradigmName = description.paradigm.toLowerCase(),
        paradigmInstance = new Paradigms[paradigmName]();

    return new GameType(name, paradigmInstance);
};

CommunicationManager.prototype.getGroupId = function(uuid) {
    var id,
        separator = '/',
        socket,
        gameType;

    trace('Getting group id for '+uuid);
    socket = this.uuid2Socket[uuid];
    if (!socket) {  // Return null if no socket has the given uuid
        trace(uuid+' does not have a socket');
        return null;
    }

    gameType = this.uuid2GameType[socket.uuid];
    id = [gameType.name, gameType.getGroupId(socket)]
        .join(separator);
    trace('Group id for "'+uuid+'" is '+id);
    return id;
};

CommunicationManager.prototype.onGroupClose = function(fn) {
    this._groupCloseListeners.push(fn);
};

CommunicationManager.prototype.fireGroupCloseEvents = function(groupId) {
    this._groupCloseListeners.forEach(function(fn) {
        fn(groupId);
    });
};

CommunicationManager.prototype._prepSocket = function(rawSocket) {
    var socket = new NBSocket(rawSocket);

    // Record the socket
    this.uuid2Socket[socket.uuid] = socket;
    this.sockets.push(socket);

    this.socket2Role[socket.id] = 'default_'+socket.id;  // FIXME: move this to UniqueRoleParadigm
    log('A new NetsBlox client has connected! UUID: ' + socket.uuid);

    // Add the socket to the default GameType
    this.joinGameType(socket, DEFAULT_GAME_TYPE);
    return socket;
};

CommunicationManager.prototype.joinGameType = function(socket, gameType) {
    var gameTypeInstance = this.gameTypes[gameType.toLowerCase()];

    trace('Adding ' + socket.uuid + ' to Game Type "' + gameType + '"');
    assert(gameTypeInstance, 'Game type "' + gameType + '" is not defined!');
    this.uuid2GameType[socket.uuid] = gameTypeInstance;
    gameTypeInstance.onConnect(socket);
};

CommunicationManager.prototype.leaveGameType = function(socket) {
    var gameType = this.uuid2GameType[socket.uuid],
        role = this.socket2Role[socket.id];    // FIXME: Move this to UniqueRoleParadigm #47

    // Broadcast the leave message to peers of the given socket
    info('Socket', socket.uuid, 'is leaving');
    gameType.onDisconnect(socket);
    delete this.uuid2GameType[socket.uuid];
};

/**
 * Check if the socket is still open. If not, clean up the groups and broadcast updates.
 *
 * @param {WebSocket} socket
 * @return {Boolean} connected?
 */
CommunicationManager.prototype.updateSocket = function(socket) {
    console.log('socket ('+socket.uuid+') state:', socket.getState());
    if (socket.getState() !== socket.OPEN) {
        info('Removing disconnected socket ('+socket.id+')');

        this.leaveGameType(socket);
        this._removeFromRecords(socket);
        return false;
    }
    return true;
};

CommunicationManager.prototype._removeFromRecords = function(socket) {
    var index = this.sockets.indexOf(socket),
        role = this.socket2Role[socket.id];    // FIXME: Move this to UniqueRoleParadigm #47

    delete this.socket2Role[socket.id];    // FIXME: Move this to UniqueRoleParadigm #47
    delete this.uuid2Socket[socket.id];
    this.sockets.splice(index,1);
    return socket;
};

/**
 * Handle a WebSocket message from a client.
 *
 * @param {WebSocket} socket
 * @param {String} message
 * @return {undefined}
 */
CommunicationManager.prototype.onMsgReceived = function(socket, message) {
    var msg = message.split(' '),
        type = msg.shift(),
        oldRole = this.socket2Role[socket.id],    // FIXME: Move this to UniqueRoleParadigm #47
        gameType = this.uuid2GameType[socket.uuid],
        peers,
        group,
        oldMembers,
        role;

    assert(gameType, 'Game Type not defined for socket #'+socket.id);

    // Early return..
    if (!gameType.isMessageAllowed(socket, message)) {
        info('GroupManager blocking message "'+message+'" from '+socket.id);
        return;
    }

    /*oldMembers = */gameType.onMessage(socket, message);

    // Handle the different request types
    if (HandleSocketRequest[type] !== undefined) {
        HandleSocketRequest[type].call(this, socket, msg);
    } else {
        log('Received invalid message type: '+type);
    }

    //if (oldMembers) {  // Update group change
        //var k;

        // Broadcast 'leave' to old peers
        //k = oldMembers.indexOf(socket);
        //oldMembers.splice(k,1);
        //this.broadcast('leave '+oldRole, oldMembers);
    //}
};

CommunicationManager.prototype.stop = function() {
    this._wss.close();
};

/**
 * Get all the groups for all paradigms.
 *
 * @return {undefined}
 */
CommunicationManager.prototype.allGroups = function() {
    var self = this,
        gameTypes = R.values(this.gameTypes);

    return gameTypes.map(function(gameType) {
        var uuidGroups = gameType
            .getAllGroups();

        return {name: gameType.name, groups: uuidGroups};
    });
};

module.exports = CommunicationManager;

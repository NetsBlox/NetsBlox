// Communication Manager
// Handles the groups and websocket communication 

'use strict';

// Web Sockets
var WebSocketServer = require('ws').Server,
    fs = require('fs'),
    counter = 0,
    GenericManager = require('./paradigms/UniqueRoleParadigm'),
    ParadigmManager = require('./ParadigmManager'),
    _ = require('lodash'),
    debug = require('debug'),
    log = debug('NetsBlox:CommunicationManager:log'),
    info = debug('NetsBlox:CommunicationManager:info'),
    trace = debug('NetsBlox:CommunicationManager:trace'),
    assert = require('assert'),

    HandleSocketRequest = require('./RequestTypes'),
    vantage = require('vantage')();

// Settings
var DEFAULT_PARADIGM = 'sandbox',
    NO_GAME_TYPE = '__none__';

var CommunicationManager = function(opts) {
    this._wss = null;
    this.sockets = [];
    this.socket2Role = {};

    // These next two are for group id retrieval
    this.socket2Uuid = {};
    this.uuid2Socket = {};

    // Group close callbacks
    this._groupCloseListeners = [];

    this.paradigmManager = new ParadigmManager(this.fireGroupCloseEvents.bind(this));

    // Set the default to Sandbox
    info('Default messaging paradigm: "'+DEFAULT_PARADIGM+'"');
};

CommunicationManager.prototype.getGroupId = function(username) {
    var id,
        separator = '/',
        socket,
        gameType,
        paradigm;

    trace('Getting group id for '+username);
    socket = this.uuid2Socket[username];
    if (!socket) {  // Return null if no socket has the given username
        trace(username+' does not have a socket');
        return null;
    }

    gameType = this.paradigmManager.getGameType(socket);
    paradigm = this.paradigmManager.getParadigmInstance(socket);
    assert(paradigm, 'Paradigm not defined for socket #'+socket.id);
    id = [gameType, paradigm.getName(), paradigm.getGroupId(socket)]
        .join(separator);
    trace('Group id for "'+username+'" is '+id);
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

CommunicationManager.prototype._prepSocket = function(socket) {
    var uuid;

    // ID the socket
    socket.id = ++counter;
    this.sockets.push(socket);
    this.socket2Role[socket.id] = 'default_'+socket.id;

    // Provide a uuid
    uuid = 'user_'+socket.id;
    this.socket2Uuid[socket.id] = uuid;
    this.uuid2Socket[uuid] = socket;
    socket.send('uuid '+uuid);

    log('A new NetsBlox client has connected! UUID: '+uuid);

    // Add the socket to the default paradigm
    this.joinParadigmInstance(socket, NO_GAME_TYPE, DEFAULT_PARADIGM);
};

CommunicationManager.prototype.joinParadigmInstance = function(socket, gameType, paradigmName) {
    this.paradigmManager.joinParadigmInstance(socket, gameType, paradigmName);

    var paradigm = this.paradigmManager.getParadigmInstance(socket);
    paradigm.onConnect(socket);
    // Broadcast 'join' on connect
    this.notifyGroupJoin(socket);
};

CommunicationManager.prototype.leaveParadigmInstance = function(socket) {
    var paradigm = this.paradigmManager.getParadigmInstance(socket),
        role = this.socket2Role[socket.id],
        peers = paradigm.getGroupMembers(socket);

    // Broadcast the leave message to peers of the given socket
    info('Socket', socket.id, 'is leaving');
    paradigm.onDisconnect(socket);
    this.broadcast('leave '+role, peers);

    // Remove the instance if empty
    if (paradigm.memberCount <= 0) {
        this.paradigmManager.removeInstance(socket);
    }
};

/**
 * Broadcast the given message to the given peers.
 *
 * @param {String} message
 * @param {WebSocket} peers
 * @return {undefined}
 */
CommunicationManager.prototype.broadcast = function(message, peers) {
    log('Broadcasting '+message,'to', peers.map(function(r){return r.id;}));
    var socket;
    for (var i = peers.length; i--;) {
        socket = peers[i];
        // Check if the socket is open
        if (socket.readyState === socket.OPEN) {
            info('Sending message "'+message+'" to socket #'+socket.id);
            socket.send(message);
        }
    }
};

/**
 * Check if the socket is still open. If not, clean up the groups and broadcast updates.
 *
 * @param {WebSocket} socket
 * @return {Boolean} connected?
 */
CommunicationManager.prototype.updateSocket = function(socket) {
    if (socket.readyState !== socket.OPEN) {
        info('Removing disconnected socket ('+socket.id+')');

        this.leaveParadigmInstance(socket);
        this.paradigmManager.remove(socket);
        this._removeFromRecords(socket);
        return false;
    }
    return true;
};

CommunicationManager.prototype._removeFromRecords = function(socket) {
    var index = this.sockets.indexOf(socket),
        role = this.socket2Role[socket.id];

    delete this.socket2Role[socket.id];
    this.sockets.splice(index,1);
    return socket;
};

/**
 * Broadcast a JOIN message to the other members in the group.
 *
 * @param {WebSocket} socket
 * @return {undefined}
 */
CommunicationManager.prototype.notifyGroupJoin = function(socket) {
    var role,
        paradigm,
        peers;

    role = this.socket2Role[socket.id];
    paradigm = this.paradigmManager.getParadigmInstance(socket);
    assert(paradigm, 'Paradigm not defined for socket #'+socket.id);

    peers = paradigm.getGroupMembers(socket);
    // Send 'join' messages to peers in the 'group'
    this.broadcast('join '+role, peers);

    // Send new member join messages from everyone else
    for (var i = peers.length; i--;) {
        if (peers[i] !== socket.id) {
            socket.send('join '+this.socket2Role[peers[i].id]);
        }
    }
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
        oldRole = this.socket2Role[socket.id],
        paradigm = this.paradigmManager.getParadigmInstance(socket),
        peers,
        group,
        oldMembers,
        role;

    assert(paradigm, 'Paradigm not defined for socket #'+socket.id);

    // Early return..
    if (!paradigm.isMessageAllowed(socket, message)) {
        info('GroupManager blocking message "'+message+'" from '+socket.id);
        return;
    }

    oldMembers = paradigm.onMessage(socket, message);

    // Handle the different request types
    if (HandleSocketRequest[type] !== undefined) {
        HandleSocketRequest[type].call(this,socket, msg);
    } else {
        log('Received invalid message type: '+type);
    }

    if (oldMembers) { // Update group change
        var k;

        // Broadcast 'leave' to old peers
        k = oldMembers.indexOf(socket);
        oldMembers.splice(k,1);
        this.broadcast('leave '+oldRole, oldMembers);

        this.notifyGroupJoin(socket);
    }
};

/**
 * Start the WebSocket server and start the socket updating interval.
 *
 * @param {Object} opts
 * @return {undefined}
 */
CommunicationManager.prototype.start = function(options) {
    var uuid;
    this._wss = new WebSocketServer(options);
    info('WebSocket server started!');

    this._wss.on('connection', function(socket) {
        this._prepSocket(socket);

        // Set up event handlers
        socket.on('message', function(data) {
            log('Received message: "'+data+ '" from', socket.id);
            this.onMsgReceived(socket, data);
        }.bind(this));

        socket.on('close', function() {
            this.updateSocket(socket);
            info('socket #'+socket.id+' closed!');
        }.bind(this));

    }.bind(this));
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
        instances = this.paradigmManager.getAllParadigmInstances();

    return instances.reduce(function(groups, container) {
        var uuidGroups = container.instance
            .getAllGroups()
            .map(function(group) {
                return group.map(function(socket) {
                    return self.socket2Uuid[socket.id];
                });
            });

        return groups.concat({name: container.name, groups: uuidGroups});
    }, []);
};

module.exports = CommunicationManager;

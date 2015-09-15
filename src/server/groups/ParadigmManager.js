// This object maintains the paradigm instances for each socket (taking into
// account the game type of the given socket).
'use strict';

var path = require('path'),
    Utils = require('../Utils'),
    debug = require('debug'),
    assert = require('assert'),

    log = debug('NetsBlox:CommunicationManager:ParadigmManager:log'),
    info = debug('NetsBlox:CommunicationManager:ParadigmManager:info'),
    trace = debug('NetsBlox:CommunicationManager:ParadigmManager:trace');

var ParadigmManager = function(groupCloseCallback) {
    this.socket2Paradigm = {};  // paradigm names
    this.socket2GameType = {};
    this.gameTypeRooms = {};  // 1 or more paradigm instances with the given gameType

    // load the constructors
    this.Paradigm = this._loadParadigms();

    this.onGroupClose = groupCloseCallback;  // When a paradigm closes a group
};

// Public API
/**
 * Retrieve the given paradigm instance for the socket (the paradigm instance in
 * the socket's game type room.
 *
 * @param {WebSocket} socket
 * @return {Paradigm}
 */
ParadigmManager.prototype.getParadigmInstance = function(socket) {
    var socketId = socket.id,
        gameType = this.socket2GameType[socketId],
        paradigmName = this.socket2Paradigm[socketId],
        paradigm;
        
    if (!gameType || !paradigmName) {
        return null;  // Socket not registered
    }

    trace('Getting paradigm for '+socket.id+' ('+gameType+'/'+paradigmName+')');

    paradigm = this.gameTypeRooms[gameType][paradigmName];
    return paradigm;
};

ParadigmManager.prototype.getAllParadigmInstances = function() {
    var gameTypes = Object.keys(this.gameTypeRooms),
        paradigms,
        instances = [],
        gameType,
        paradigm;

    for (var i = gameTypes.length; i--;) {
        gameType = gameTypes[i];
        paradigms = Object.keys(this.gameTypeRooms[gameType]);
        for (var j = paradigms.length; j--;) {
            paradigm = paradigms[j];
            instances.push({
                name: gameType+'/'+paradigm,
                instance: this.gameTypeRooms[gameType][paradigm]
            });
        }
    }
    return instances;
};

ParadigmManager.prototype.getGameType = function(socket) {
    return this.socket2GameType[socket.id];
};

ParadigmManager.prototype.isValidParadigm = function(name) {
    return !!this.Paradigm[name.toLowerCase()];
};

ParadigmManager.prototype.joinParadigmInstance = function(socket, gameType, paradigmName) {
    var gameRoom,
        paradigm;

    // If the gameType or paradigmName is null, we use the current
    if(gameType) {
        this.joinGameType(socket, gameType);
    }
    if (paradigmName) {
        this.joinParadigm(socket, paradigmName);
    }
};

ParadigmManager.prototype.remove = function(socket) {
    delete this.socket2GameType[socket.id];
    delete this.socket2Paradigm[socket.id];
};

/**
 * Remove the paradigm instance containing the given socket
 *
 * @param {WebSocket} socket
 * @return {undefined}
 */
ParadigmManager.prototype.removeInstance = function(socket) {
    var gameType = this.socket2GameType[socket.id],
        paradigm = this.socket2Paradigm[socket.id];

    delete this.gameTypeRooms[gameType][paradigm];
};

ParadigmManager.prototype.joinParadigm = function(socket, paradigmName) {
    var gameType = this.socket2GameType[socket.id];

    info('Socket '+socket.id+' is joining paradigm "'+paradigmName+'"');

    if (gameType) {  // Create paradigm in the given room
        this._createParadigmIfNeeded(gameType, paradigmName);
    }

    this.socket2Paradigm[socket.id] = paradigmName;
};

ParadigmManager.prototype.joinGameType = function(socket, gameType) {
    var paradigmName = this.socket2Paradigm[socket.id];
    trace('Adding '+socket.id+' to '+gameType);
    this.socket2GameType[socket.id] = gameType;

    if (!this.gameTypeRooms[gameType]) {  // Create new group type room
        this.gameTypeRooms[gameType] = {};
    }

    if (paradigmName) {  // Create new paradigm instance
        this._createParadigmIfNeeded(gameType, paradigmName);
    }
};

// Private API
ParadigmManager.prototype._loadParadigms = function() {
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

ParadigmManager.prototype._createParadigmIfNeeded = function(gameType, name) {
    if (!this.gameTypeRooms[gameType][name]) {
        trace('Creating paradigm instance in "'+gameType+'" of type "'+name+'"');

        var paradigm = new this.Paradigm[name]();
        paradigm.onGroupClose = this.onGroupClose;
        this.gameTypeRooms[gameType][name] = paradigm;
        return paradigm;
    }
};

module.exports = ParadigmManager;

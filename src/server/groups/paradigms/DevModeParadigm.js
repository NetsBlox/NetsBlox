/*
 * This paradigm is used in Game Types for users in development mode.
 *
 * This paradigm will create a number of groups for each username and will only
 * add a user to one of the groups owned by his username.
 *
 * @author brollb / https://github/brollb
 */

'use strict';

var BaseParadigm = require('./AbstractParadigm'),
    Utils = require('../../Utils'),
    R = require('ramda'),
    debug = require('debug'),
    log = debug('NetsBlox:CommunicationManager:Paradigms:DevMode:log'),
    info = debug('NetsBlox:CommunicationManager:Paradigms:DevMode:info'),
    assert = require('assert'),
    EMPTY_GROUP = [];

var DevModeParadigm = function() {
    BaseParadigm.call(this);
    this.userGroups = {};  // username -> dictionary of groups by groupId
    this.uuidToGroupId = {};  // this is a group id unique among the user's groups
    this.uuidToUsername = {};

    this.unknownUuids = {};  // uuid -> socket
};

Utils.inherit(DevModeParadigm.prototype, BaseParadigm.prototype);

DevModeParadigm.getName = function() {
    return 'DevMode';
};

DevModeParadigm.prototype.getName = DevModeParadigm.getName;

/**
 * Return arrays of sockets grouped by their groups.
 *
 * @return {Array<WebSocket>}
 */
DevModeParadigm.prototype._getAllGroups = function() {
    var groups = R.values(this.unknownUuids)
            .map(function(socket) {
                return [socket];
            });

    // TODO: Add userGroups
    return groups;
};

DevModeParadigm.prototype.getAllGroups = function() {
    var groups = BaseParadigm.prototype.getAllGroups.call(this);
    return groups.map(uuids => uuids.map(uuid => uuid + '(devMode)'));
};

/**
 * Members to receive a message from the given socket
 *
 * @param {WebSocket} socket
 * @return {Array<WebSocket>}
 */
DevModeParadigm.prototype.getGroupMembersToMessage = function(socket) {
    if (this.unknownUuids[socket.uuid]) {
        return [];
    }
    var group = this._getGroup(socket);
    return R.reject(R.partial(R.eq, socket), group);
};

/**
 * Members to receive join/leave events
 *
 * @param socket
 * @return {undefined}
 */
DevModeParadigm.prototype.getGroupMembers = 
    DevModeParadigm.prototype.getGroupMembersToMessage;

/**
 * Get the unique group id given the socket
 *
 * @param {WebSocket} socket
 * @return {Int} group id
 */
DevModeParadigm.prototype.getGroupId = function(socket) {
    var groupId = this.uuidToGroupId[socket.uuid],
        username = this.uuidToUsername[socket.uuid];

    return [username, groupId].join('/');
};

DevModeParadigm.prototype.onMessage = function(socket, message) {
    // If it is a username message for an unknown uuid, move it to it's set of
    // rooms
    var data = message.split(' '),
        type = data.shift(),
        username = this.uuidToUsername[uuid],
        uuid = socket.uuid;

    if (type === 'username') {
        this.addSocket(socket, data.join(' '));
    } else if (type === 'requestJoin' && username) {
        var groupId = data[0],
            groups = this.userGroups[username];

        assert(groups, 'User "'+username+'" has no groups!');

        groups[groupId] = groups[groupId] || [];
        groups[groupId].push(socket);
    }
    return null;
};

DevModeParadigm.prototype.addSocket = function(socket, username) {
    var uuid = socket.uuid;
    if (!username) {
        // Users will be sandboxed until they have a username
        this.unknownUuids[uuid] = socket;
    } else {
        delete this.unknownUuids[uuid];
        this.uuidToUsername[uuid] = username;
        this.userGroups[username] = {};
    }
};

DevModeParadigm.prototype.onDisconnect = function(socket) {
    BaseParadigm.prototype.onDisconnect.call(this, socket);
    var uuid = socket.uuid,
        username = this.uuidToUsername[uuid],
        groupId = this.uuidToGroupId[uuid],
        group,
        index;

    if (username) {
        group = this.userGroups[username][groupId];
        if (group) {
            index = group.indexOf(socket);
            assert(index !== -1, 'Removing unknown socket from group!');
            group.splice(index, 1);
            if (!group.length) {
                delete this.userGroups[username][groupId];
            }
        }
    }
    delete this.uuidToUsername[uuid];
    delete this.uuidToGroupId[uuid];
    delete this.unknownUuids[uuid];
};

DevModeParadigm.prototype.onConnect = function(socket, username) {
    BaseParadigm.prototype.onConnect.call(this, socket);
    this.addSocket(socket, username);
};

/**
 * Get the group for the given socket.
 *
 * @param {NetsBloxSocket} socket
 * @return {NetsBloxSocket[]}
 */
DevModeParadigm.prototype._getGroup = function(socket) {
    var username = this.uuidToUsername[socket.uuid],
        groupId = this.uuidToGroupId[socket.uuid];

    return username ? this.userGroups[username][groupId] : EMPTY_GROUP;
};

module.exports = DevModeParadigm;

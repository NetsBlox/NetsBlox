/*
 * This paradigm groups the sockets by their roles. Assumes nothing about the 
 * client app except that each role should be unique for each game.
 *
 * @author brollb / https://github/brollb
 */

'use strict';
var BaseParadigm = require('./AbstractParadigm'),
    Utils = require('../../Utils.js'),
    assert = require('assert'),
    R = require('ramda'),
    defaultRolePrefix = 'default_',
    ID_KEY = '__id__',
    COUNT = 0,

    debug = require('debug'),
    log = debug('NetsBlox:CommunicationManager:Paradigm:UniqueRole:log'),
    info = debug('NetsBlox:CommunicationManager:Paradigm:UniqueRole:info'),
    trace = debug('NetsBlox:CommunicationManager:Paradigm:UniqueRole:trace');

var UniqueRoleParadigm = function() {
    BaseParadigm.call(this);
    // A group is a hash map of role names to ids
    this.groups = [];
    this.globalGroup = this._createNewGroup();

    // Dictionary records
    this.uuid2Group = {};
    this.uuid2Socket = {};
    this.uuid2Role = {};
};

Utils.inherit(UniqueRoleParadigm.prototype, BaseParadigm.prototype);

// Public API
UniqueRoleParadigm.getName = function() {
    return 'UniqueRole';
};

UniqueRoleParadigm.prototype.getName = UniqueRoleParadigm.getName;

/**
 * Get the group id given the username
 *
 * @param {WebSocket} id
 * @return {Int} group id
 */
UniqueRoleParadigm.prototype.getGroupId = function(socket) {
    return this.uuid2Group[socket.uuid][ID_KEY];
};

UniqueRoleParadigm.prototype.getAllGroups = function() {
    var groups = BaseParadigm.prototype.getAllGroups.call(this);
    return groups.map(uuids => uuids.map(uuid => uuid + ' (' + this.uuid2Role[uuid] + ')'));
};

UniqueRoleParadigm.prototype._getAllGroups = function() {
    var groups = this.groups.concat([this.globalGroup]);
    return groups.map(this._getGroupSockets);
};

UniqueRoleParadigm.prototype.getGroupMembersToMessage = function(socket) {
    var self = this,
        group = this.uuid2Group[socket.uuid];

    assert(group, 'Socket '+socket.uuid+' does not have a group');
    return this._getGroupSockets(group);
};

/**
 * Get the peers of the given socket.
 *
 * @param {String} id
 * @return {Array<Id>}
 */
UniqueRoleParadigm.prototype.getGroupMembers = function(socket) {
    var group = this.getGroupMembersToMessage(socket),
        getId = R.partialRight(Utils.getAttribute, 'uuid'),
        isSocketId = R.partial(R.eq, socket.uuid);

    return R.reject(R.pipe(getId, isSocketId), group);
};

/**
 * Event handler for a socket connection. Socket id is added to the global
 * group.
 *
 * @param {WebSocket} socket
 * @return {undefined}
 */
UniqueRoleParadigm.prototype.onConnect = function(socket) {
    trace('Socket connected: "' + socket.uuid + '"');
    var uuid = socket.uuid;
    this.uuid2Socket[uuid] = socket;
    this.uuid2Role[uuid] = uuid;  // Unique default role

    this._addClientToGroup(socket, this.globalGroup);
    BaseParadigm.prototype.onConnect.call(this, socket);
};

/**
 * If the message is a 'register' message, then update the role and group. If 
 * the group changes, return the old group members;
 *
 * @param {String} id
 * @return {Array<Ids>|null} 
 */
UniqueRoleParadigm.prototype.onMessage = function(socket, message) {
    var uuid = socket.uuid,
        data = message.split(' '),
        type = data.shift(),
        role,
        oldRole = this.uuid2Role[uuid],
        oldGroupMembers = null;

    if (type === 'register') {
        role = data.join(' ');
        if (oldRole !== role) {
            trace('setting', uuid, 'to', role);
            this.uuid2Role[uuid] = role;
            // Check if can stay in current group
            if (this._canSwitchRolesInCurrentGroup(uuid, role)) {
                delete this.uuid2Group[uuid][oldRole];
            } else {
                oldGroupMembers = this.getGroupMembers(socket);
                // Remove the socket from the current group
                this._removeClientFromGroup(uuid, oldRole);
                this._findGroupForClient(socket);
            }

            // Join the new group
            this.notifyGroupJoin(socket);
        }
    }

    if (oldGroupMembers) {
        this.broadcast('leave '+oldRole, oldGroupMembers);
    }

    return oldGroupMembers;
};

/**
 * Event handler for socket disconnect. Remove the socket from it's group.
 *
 * @param id
 * @return {undefined}
 */
UniqueRoleParadigm.prototype.onDisconnect = function(socket) {
    // Update the groups
    var uuid = socket.uuid,
        role = this.uuid2Role[uuid],
        group = this.uuid2Group[uuid];

    BaseParadigm.prototype.onDisconnect.call(this, socket);
    if (group !== undefined) {
        // Remove role from group
        this._removeClientFromGroup(uuid, role);
    }
};

/**
 * Broadcast a JOIN message to the other members in the group.
 *
 * @param {WebSocket} socket
 * @return {undefined}
 */
UniqueRoleParadigm.prototype.notifyGroupJoin = function(socket) {
    var role,
        gameType,
        peers;

    role = this.uuid2Role[socket.uuid];
    peers = this.getGroupMembers(socket);
    // Send 'join' messages to peers in the 'group'
    this.broadcast('join '+role, peers);

    // Send new member join messages from everyone else
    for (var i = peers.length; i--;) {
        if (peers[i] !== socket.uuid) {
            socket.send('join '+this.uuid2Role[peers[i].uuid]);
        }
    }
};

UniqueRoleParadigm.prototype.notifyGroupLeave = function(socket) {
    var peers = this.getGroupMembers(socket),
        role = this.uuid2Role[socket.uuid];

    this.broadcast('leave '+role, peers);
};


// Internal API
UniqueRoleParadigm.prototype._removeClientFromGroup = function(id, role) {
    var oldGroup = this.uuid2Group[id];

    if (Object.keys(oldGroup).length === 1) {
        this.notifyGroupClose(this.uuid2Socket[id]);
    }

    delete oldGroup[role];
    delete this.uuid2Group[id];
};

/**
 * Add the client to the given group.
 *
 * @param {String} id
 * @param {Group} group
 * @return {undefined}
 */
UniqueRoleParadigm.prototype._addClientToGroup = function(socket, group) {
    var id = socket.uuid,
        role = this.uuid2Role[id];

    group[role] = socket;
    this.uuid2Group[id] = group;
};

/**
 * Find a group for the client that doesn't have that role filled. Create a
 * new group if needed.
 *
 * @param {String} id
 * @param {String} role
 * @return {undefined}
 */

UniqueRoleParadigm.prototype._findGroupForClient = function(socket) {
    var uuid = socket.uuid,
        role = this.uuid2Role[uuid];

    // Add client to group based on it's role
    for (var i = 0; i < this.groups.length; i++) {
        if (!this.groups[i][role]) {  // If not in the group, add it
            return this._addClientToGroup(socket, this.groups[i]);
        }
    }

    // Create a new group
    this.groups.push(this._createNewGroup());
    this._addClientToGroup(socket, this.groups[this.groups.length-1]);
};

UniqueRoleParadigm.prototype._canSwitchRolesInCurrentGroup = function(id, newRole) {
    var group = this.uuid2Group[id];

    return !group[newRole] && group !== this.globalGroup;
};

UniqueRoleParadigm.prototype._getGroupSockets = function(group) {
    var roles = R.difference(Object.keys(group), [ID_KEY]);

    return roles.map(function(role) {
        return group[role];
    });
};

UniqueRoleParadigm.prototype._createNewGroup = function() {
    var group = {};
    group[ID_KEY] = COUNT++;
    return group;
};

UniqueRoleParadigm.prototype._printGroups = function() {
    console.log('Printing groups:');
    this.groups.forEach(this._printGroup.bind(this));
};

UniqueRoleParadigm.prototype._printGroup = function(group) {
    var number = this.groups.indexOf(group);
    console.log('Group', number, ':', R.mapObj(s => s.uuid, group));
};

module.exports = UniqueRoleParadigm;

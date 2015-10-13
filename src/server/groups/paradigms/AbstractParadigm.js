/*
 * This is the abstract base class for all the paradigms.
 *
 * @author brollb / https://github/brollb
 */

// Some group managers may need to broadcast information to the 
// other members on group change (eg, if the group manager is 
// assigning the role)
'use strict';

var assert = require('assert'),
    _ = require('lodash'),
    BroadcastInterface = require('../Broadcaster');

var AbstractParadigm = function() {
    this.memberCount = 0;
};

_.extend(AbstractParadigm.prototype, BroadcastInterface);

// Public Methods
AbstractParadigm.getName = function() {
    return '__abstract__';
};

AbstractParadigm.prototype.getName = AbstractParadigm.getName;

AbstractParadigm.prototype.getDescription = function() {
    return 'Paradigm has not provided a description';
};

/**
 * Return arrays of sockets grouped by their groups. This is used by vantage
 * to provide easy debugging.
 *
 * @return {undefined}
 */
AbstractParadigm.prototype.getAllGroups = function() {
    return this._getAllGroups().map(group => group.map(socket => socket.uuid));
};

/**
 * Get all the groups organized by the sockets.
 *
 * @return {undefined}
 */
AbstractParadigm.prototype._getAllGroups = function() {
    return [];
};

/**
 * Members to receive a message from the given socket
 *
 * @param socket
 * @return {undefined}
 */
AbstractParadigm.prototype.getGroupMembersToMessage = function(socket) {
    return [];
};

AbstractParadigm.prototype.getGroupMembers = function(socket) {
    return [];
};

/**
 * Get the group id given the username
 *
 * @param {WebSocket} id
 * @return {Int} group id
 */
AbstractParadigm.prototype.getGroupId = function(socket) {
    return 1;
};

AbstractParadigm.prototype.onConnect = function(socket) {
    this.memberCount++;
    this.notifyGroupJoin(socket);
};

/**
 * Filter socket messages.
 *
 * @param {WebSocket} socket
 * @param {String} message
 * @return {undefined}
 */
AbstractParadigm.prototype.isMessageAllowed = function(socket, message) {
    return true;
};

AbstractParadigm.prototype.onMessage = function(socket, message) {
    return null;
};

AbstractParadigm.prototype.onDisconnect = function(socket) {
    this.notifyGroupLeave(socket);
    this.memberCount--;
    assert(this.memberCount >= 0);
};

/**
 * Callback for closing a group. This will be overridden by the Communication
 * Manager to allow functions to be evaluated when this event occurs.
 *
 * @param {String} groupId
 * @return {undefined}
 */
AbstractParadigm.prototype.onGroupClose = function(groupId) {
    // nop
};

// Protected Methods
/**
 * Invoke the onGroupClose method.
 *
 * @param {WebSocket} socket
 * @return {undefined}
 */
AbstractParadigm.prototype.notifyGroupClose = function(socket) {
    var groupId = this.getGroupId(socket);
    this.onGroupClose(groupId);
};

/**
 * Broadcast a JOIN message to the other members in the group.
 *
 * @param {WebSocket} socket
 * @return {undefined}
 */
AbstractParadigm.prototype.notifyGroupJoin = function(socket) {
    var role,
        gameType,
        peers;

    //role = this.socket2Role[socket.id];    // FIXME: Move this to UniqueRoleParadigm #47
    peers = this.getGroupMembers(socket);
    // Send 'join' messages to peers in the 'group'
    this.broadcast('join '/*+role*/, peers);

    // Send new member join messages from everyone else
    for (var i = peers.length; i--;) {
        if (peers[i] !== socket.id) {
            socket.send('join '/*+this.socket2Role[peers[i].id]*/);  // FIXME: Update this with #47
        }
    }
};

AbstractParadigm.prototype.notifyGroupLeave = function(socket) {
    var peers = this.getGroupMembers(socket);
    this.broadcast('leave '/*+role*/, peers);
};

module.exports = AbstractParadigm;

/*
 * This paradigm simply puts all group members in a single global group and broadcasts
 * messages to all peers.
 *
 * @author brollb / https://github/brollb
 */

// Some group managers may need to broadcast information to the 
// other members on group change (eg, if the group manager is 
// assigning the role)
'use strict';

var assert = require('assert');
var BasicParadigm = function() {
    this.globalGroup = [];  // TODO: Move this elsewhere
    this.memberCount = 0;
};

BasicParadigm.getName = function() {
    return 'Basic';
};

BasicParadigm.prototype.getName = BasicParadigm.getName;

BasicParadigm.prototype.getDescription = function() {
    // TODO
    return 'Every one can receive messages from everyone else';
};

/**
 * Return arrays of sockets grouped by their groups.
 *
 * @return {undefined}
 */
BasicParadigm.prototype.getAllGroups = function() {
    return [this.globalGroup.slice()];
};

/**
 * Members to receive a message from the given socket
 *
 * @param socket
 * @return {undefined}
 */
BasicParadigm.prototype.getGroupMembersToMessage = function(socket) {
    return this.globalGroup.slice();
};

BasicParadigm.prototype.getGroupMembers = function(socket) {
    assert(this.globalGroup instanceof Array);
    return this.globalGroup.filter(function(s) { 
        return s !== socket;
    });
};

/**
 * Get the group id given the username
 *
 * @param {WebSocket} id
 * @return {Int} group id
 */
BasicParadigm.prototype.getGroupId = function(socket) {
    return 1;
};

BasicParadigm.prototype.onConnect = function(socket) {
    assert(this.globalGroup instanceof Array);
    this.globalGroup.push(socket);
    this.memberCount++;
};

/**
 * Filter socket messages.
 *
 * @param {WebSocket} socket
 * @param {String} message
 * @return {undefined}
 */
BasicParadigm.prototype.isMessageAllowed = function(socket, message) {
    return true;
};

BasicParadigm.prototype.onMessage = function(socket, message) {
    return null;
};

BasicParadigm.prototype.onDisconnect = function(socket) {
    assert(this.globalGroup instanceof Array);
    var i = this.globalGroup.indexOf(socket);
    this.globalGroup.splice(i,1);
    this.memberCount--;

    assert(this.globalGroup instanceof Array);
    assert(this.memberCount >= 0);
};

/**
 * Callback for closing a group. This will be overridden by the Communication
 * Manager to allow functions to be evaluated when this event occurs
 *
 * @param {String} groupId
 * @return {undefined}
 */
BasicParadigm.prototype.onGroupClose = function(groupId) {
    // nop
};

BasicParadigm.prototype.notifyGroupClose = function(socket) {
    var groupId = this.getGroupId(socket);
    this.onGroupClose(groupId);
};

module.exports = BasicParadigm;

/*
 * This paradigm simply isolates all users in their own group so there is no
 * communication (potentially useful in development).
 *
 * Currently, it allows the user to message themselves.
 *
 * @author brollb / https://github/brollb
 */

'use strict';

var BaseParadigm = require('./Basic.js'),
    Utils = require('../../Utils.js'),
    debug = require('debug'),
    log = debug('NetsBlox:CommunicationManager:Paradigms:Sandbox:log'),
    info = debug('NetsBlox:CommunicationManager:Paradigms:Sandbox:info'),
    assert = require('assert');

var SandboxParadigm = function() {
    BaseParadigm.call(this);
    this.groups = [];
    this.count = 0;
};

Utils.inherit(SandboxParadigm.prototype, BaseParadigm.prototype);

SandboxParadigm.getName = function() {
    return 'Sandbox';
};

SandboxParadigm.prototype.getName = SandboxParadigm.getName;

/**
 * Return arrays of sockets grouped by their groups.
 *
 * @return {Array<WebSocket>}
 */
SandboxParadigm.prototype.getAllGroups = function() {
    return this.groups.map(function(group) {
        return [group.user];
    });
};

/**
 * Members to receive a message from the given socket
 *
 * @param {WebSocket} socket
 * @return {Array<WebSocket>}
 */
SandboxParadigm.prototype.getGroupMembersToMessage = function(socket) {
    return [socket];  // Allow the user to hear it's own messages
};

SandboxParadigm.prototype.getGroupMembers = function(socket) {
    return [];
};

/**
 * Get the unique group id given the socket
 *
 * @param {WebSocket} socket
 * @return {Int} group id
 */
SandboxParadigm.prototype.getGroupId = function(socket) {
    var group = this._findGroupContaining(socket);
    if (group) {
        return group.id;
    }
    return -1;
};

SandboxParadigm.prototype.onConnect = function(socket) {
    this.groups.push({id: this.count++, user: socket});
    this.memberCount++;
};

/**
 * Filter socket messages.
 *
 * @param {WebSocket} socket
 * @param {String} message
 * @return {Boolean}
 */
SandboxParadigm.prototype.isMessageAllowed = function(socket, message) {
    return true;
};

SandboxParadigm.prototype.onMessage = function(socket, message) {
    return null;
};

SandboxParadigm.prototype.onDisconnect = function(socket) {
    var group = this._findGroupContaining(socket),
        index;
    if (group) {
        this.notifyGroupClose(socket);
        index = this.groups.indexOf(group);
        this.groups.splice(index,1);
        this.memberCount--;
        assert(this.memberCount >= 0);
    }
};

SandboxParadigm.prototype._findGroupContaining = function(socket) {
    for (var i = this.groups.length; i--;) {
        if (this.groups[i].user === socket) {
            return this.groups[i];
        }
    }
    return null;
};

module.exports = SandboxParadigm;

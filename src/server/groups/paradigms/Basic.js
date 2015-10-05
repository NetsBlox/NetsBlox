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

var assert = require('assert'),
    BaseParadigm = require('./AbstractParadigm'),
    _ = require('lodash');

var BasicParadigm = function() {
    BaseParadigm.call(this);
    this.globalGroup = [];
};

_.extend(BasicParadigm.prototype, BaseParadigm.prototype);

BasicParadigm.getName = function() {
    return 'Basic';
};

BasicParadigm.prototype.getName = BasicParadigm.getName;

BasicParadigm.prototype.getDescription = function() {
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
    BaseParadigm.prototype.onConnect.call(this, socket);
    console.log(this.globalGroup);
    assert(this.globalGroup instanceof Array, 'globalGroup is '+this.globalGroup);
    this.globalGroup.push(socket);
};

BasicParadigm.prototype.onDisconnect = function(socket) {
    BaseParadigm.prototype.onDisconnect.call(this, socket);

    assert(this.globalGroup instanceof Array);
    var i = this.globalGroup.indexOf(socket);
    this.globalGroup.splice(i,1);

    assert(this.globalGroup instanceof Array);
};

module.exports = BasicParadigm;

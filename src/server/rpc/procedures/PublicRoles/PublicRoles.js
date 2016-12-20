// This is a key value store that can be used across tables
'use strict';

var debug = require('debug'),
    trace = debug('NetsBlox:RPCManager:PublicRoles:trace'),
    publicRoleManager = require('../../../PublicRoleManager');

module.exports = {

    // This is very important => Otherwise it will try to instantiate this
    isStateless: true,

    // These next two functions are the same from the stateful RPC's
    getPath: function() {
        return '/publicRoles';
    },

    requestPublicRoleId: function() {
        var id = publicRoleManager.register(this.socket);

        trace(`${this.socket.username} has requested public id ${id}`);

        return id;
    }
};

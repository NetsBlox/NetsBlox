// This is a key value store that can be used across tables
'use strict';

var debug = require('debug'),
    trace = debug('netsblox:rpc:public-roles:trace'),
    PublicRoleManager = require('../../../public-role-manager');

module.exports = {

    // This is very important => Otherwise it will try to instantiate this
    isStateless: true,

    // These next two functions are the same from the stateful RPC's
    getPath: function() {
        return '/publicRoles';
    },

    requestPublicRoleId: function() {
        var id = PublicRoleManager.register(this.socket);

        trace(`${this.socket.username} has requested public id ${id}`);

        return id;
    }
};

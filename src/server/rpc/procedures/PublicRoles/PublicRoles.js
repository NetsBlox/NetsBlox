// This is a key value store that can be used across tables
'use strict';

var debug = require('debug'),
    log = debug('NetsBlox:RPCManager:PublicRoles:log'),
    trace = debug('NetsBlox:RPCManager:PublicRoles:trace'),
    publicRoleManager = require('../../../PublicRoleManager');

var publicIds = {},
    socketToId = new Map();

var removeId = function(socket) {
    var id = socketToId.get(socket);

    socketToId.delete(socket);
    if (id) {
        delete publicIds[id];
    }
};

module.exports = {

    // This is very important => Otherwise it will try to instantiate this
    isStateless: true,

    // These next two functions are the same from the stateful RPC's
    getPath: function() {
        return '/publicRoles';
    },

    getActions: function() {
        return ['requestPublicRoleId'];
    },

    requestPublicRoleId: function(req, res) {
        var socket = req.netsbloxSocket,
            id = publicRoleManager.register(socket);

        trace(`${socket.username} has requested public id ${id}`);

        res.status(200).send(id);
    }
};

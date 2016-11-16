// This is a key value store that can be used across tables
'use strict';

var debug = require('debug'),
    log = debug('NetsBlox:RPCManager:InterRoom:log'),
    trace = debug('NetsBlox:RPCManager:InterRoom:trace'),
    randomId = require('just.randomstring'),
    ID_LENGTH = 5;

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
        return '/interroom';
    },

    getActions: function() {
        return ['requestId', 'requestRoleFromId'];
    },

    requestId: function(req, res) {
        // absolute role has:
        //   - owner
        //   - name
        //   - role
        var socket = req.netsbloxSocket,
            len = ID_LENGTH,
            id = randomId(len);

        while (publicIds[id]) {
            id = randomId(len);
            len++;
        }
        removeId(socket);  // only one id per user

        publicIds[id] = socket;
        socketToId.set(socket, id);

        trace(`${socket.username} has requested public id ${id}`);
        socket.onclose.push(removeId.bind(null, socket));
        res.status(200).send(id);
    },

    requestRoleFromId: function(req, res) {
        var id = req.query.id,
            socket = publicIds[id],
            publicRole;

        if (socket && socket.hasRoom()) {
            publicRole = {
                room: {
                    owner: socket._room.owner.username,
                    name: socket._room.name
                },
                role: socket.roleId
            };
            return res.status(200).json(publicRole);
        }
        res.status(200).send(false);
    }
};

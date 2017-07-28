// This is a key value store that can be used across tables
'use strict';

var debug = require('debug'),
    trace = debug('netsblox:rpc:public-roles:trace');

module.exports = {

    // This is very important => Otherwise it will try to instantiate this
    isStateless: true,

    requestPublicRoleId: function() {
        var socket = this.socket;

        return this.socket.getRoom().then(room => {
            var owner = room.owner,
                roomName = room.name,
                roleId = socket.roleId;

            trace(`${this.socket.username} has requested public id`);
            return [
                roleId,
                roomName,
                owner
            ].join('@');
        });
    }
};

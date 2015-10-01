'use strict';
var debug = require('debug'),
    log = debug('NetsBlox:RequestTypes:log'),
    trace = debug('NetsBlox:RequestTypes:trace'),
    nop = require('nop');

var Requests = {
        /**
         * Register the socket's role.
         *
         * @param {WebSocket} socket
         * @param {Array<String>} msg
         * @return {undefined}
         */
        register: function(socket, msg) {
            var role = msg.shift();  // record the roleId
            console.log('registering '+socket.id+' as '+role);
            this.socket2Role[socket.id] = role;  // FIXME: Move this to UniqueRoleParadigm #47
        },

        gameType: function(socket, msg) {
            var name = msg.join(' ');

            this.leaveGameType(socket);
            this.joinGameType(socket, name, null);
            trace('Moved '+socket.uuid+' to game type: "'+name+'"');
            // TODO: Log an error
        },

        /**
         * Message to be emitted to the user's peers wrt the given paradigm.
         *
         * @param {WebSocket} socket
         * @param {Array<String>} msg
         * @return {undefined}
         */
        message: function(socket, msg) {
            var role,
                peers,
                gameType;

            // broadcast the message, role to all peers
            gameType = this.uuid2GameType[socket.uuid];
            role = this.socket2Role[socket.id];  // FIXME: Move this to UniqueRoleParadigm #47
            msg.push(role);
            log('About to broadcast '+msg.join(' ')+
                        ' from socket #'+socket.id+' ('+role+')');
            peers = gameType.getGroupMembersToMessage(socket);
            this.broadcast(msg.join(' '), peers);
        },
        devMode: nop  // Suppress unknown message warnings. This is used by the GameType
};
module.exports = Requests;

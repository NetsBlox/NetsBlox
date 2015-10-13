'use strict';
var debug = require('debug'),
    log = debug('NetsBlox:RequestTypes:log'),
    trace = debug('NetsBlox:RequestTypes:trace'),
    nop = require('nop');

var Requests = {
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
            msg.push(role);
            log('About to broadcast '+msg.join(' ')+
                        ' from socket #'+socket.id+' ('+role+')');
            peers = gameType.getGroupMembersToMessage(socket);
            this.broadcast(msg.join(' '), peers);
        },
        // Suppress unknown message warnings. This is used by the GameType
        devMode: nop,
        register: nop
};
module.exports = Requests;

'use strict';
var debug = require('debug'),
    log = debug('NetsBlox:RequestTypes:log'),
    trace = debug('NetsBlox:RequestTypes:trace'),
    nop = require('nop');

var Requests = {
        /**
         * Join the table
         *
         * @param {WebSocket} socket
         * @param {String} msg
         * @return {undefined}
         */
        'join': function joinTable(username, socket, msg) {
            var table = msg.join(' ');
            // Check that the socket is a member of the table
            // TODO

            // Get the username from the socket
            // TODO

            trace('Join table request from ' + socket.uuid);
            // TODO: Log an error
        },

        /**
         * Leave the given table
         *
         * @param {String} username
         * @param {WebSocket} socket
         * @param {String} msg
         * @return {undefined}
         */
        'leave': function leaveTable(username, socket, msg) {
            // TODO
            var table = msg.join(' ');

            trace('Join table request from ' + socket.uuid);
            // TODO: Log an error
        },

        'table-join-request': function viewSeat(username, socket, msg) {
            // TODO: Decorate and forward
        },

        'table-join-response': function (username, socket, msg) {
            // TODO: Forward
        },

        'direct-message': function(username, socket, msg) {
            // Send the message to the associated seats
            // TODO
        },

        'basic-message': function(username, socket, msg) {
            // Send the message to the table
            // TODO
        },

        // Lower priority
        'view': function(username, socket, msg) {
            // TODO
        },

        'seat-join-request': function viewSeat(username, socket, msg) {
            // TODO: Forward
        }
};

// Check the message formats?
// TODO
module.exports = Requests;

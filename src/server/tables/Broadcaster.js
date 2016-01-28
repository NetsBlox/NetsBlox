// Interface for broadcasting to sockets

/**
 * Broadcast the given message to the given peers.
 *
 * @param {String} message
 * @param {WebSocket} peers
 * @return {undefined}
 */
var broadcast = function(message, peers) {
    //log('Broadcasting '+message,'to', peers.map(function(r){return r.id;}));
    var socket;
    for (var i = peers.length; i--;) {
        socket = peers[i];
        // Check if the socket is open
        if (socket.getState() === socket.OPEN) {
            //info('Sending message "'+message+'" to socket #'+socket.id);
            console.log('Sending message "'+message+'" to socket #'+socket.id);
            socket.send(message);
        }
    }
};

module.exports = {
    broadcast: broadcast
};

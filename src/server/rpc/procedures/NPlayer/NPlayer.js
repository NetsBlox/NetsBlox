// This is the NPlayer game RPC. It ensures round-robin turn taking with N players.

'use strict';

var R = require('ramda'),
    debug = require('debug'),
    info = debug('NetsBlox:RPCManager:NPlayer:info');

/**
 * NPlayer - This constructor is called on the first request to an RPC
 * from a given room
 *
 * @constructor
 * @return {undefined}
 */
var NPlayer = function() {
    this.active = null;
    this.previous = null;
    this.players = [];
};

/**
 * Return the path to the given RPC
 *
 * @return {String}
 */
NPlayer.getPath = function() {
    return '/NPlayer';
};

// start the game
NPlayer.prototype.start = function() {

    // populate the players list
    this.players = [];
    
    this.players = this.socket._room.sockets().map(socket => {
        return {role: socket.roleId, socket: socket};
    });

    // set the active player to the current one
    this.active = R.findIndex(R.propEq('role', this.socket.roleId))(this.players);

    info(`Player #${this.active} (${this.players[this.active].role}) is (re)starting a ${this.players.length} player game`);

    // Send the start message to everyone
    this.players.forEach(player => player.socket.send({
        type: 'message',
        dstId: player.role,
        msgType: 'start game',
        content: {}
    }));

    return true;
};

// get the number of players
NPlayer.prototype.getN = function() {    
    return this.players.length;
};

// get the active role
NPlayer.prototype.getActive = function() {
    if(this.players.length === 0) {
        return '';
    } else {
        return this.players[this.active].role;
    }
};

// get the previous role
NPlayer.prototype.getPrevious = function() {
    if(this.previous == null || this.players.length == 0) {
        return '';
    } else {
        return this.players[this.previous].role;
    }
};

// get the next role
NPlayer.prototype.getNext = function() {
    if(this.players.length == 0) {
        return '';
    } else {
        var index = (this.active + 1) % this.players.length;
        return this.players[index].role;
    }
};


// signal end of turn
NPlayer.prototype.endTurn = function(next) {

    if(this.active === null || this.socket.roleId != this.players[this.active].role ) {
        // bail out if there's no game yet, or if it's somebody else's turn
        return false;
    } else {

        info(`Player #${this.active} (${this.players[this.active].role}) called endTurn`);

        var nextIndex;
        if(next == '') {
            nextIndex = (this.active + 1) % this.players.length;
        } else {
            nextIndex = R.findIndex(R.propEq('role', next), this.players);
            if(nextIndex === -1) {
                info('Role ' +next+ ' is not part of the game');
                return false;
            }                       
        }

        // save previous player's index, and make the next player active
        this.previous = this.active;
        this.active = nextIndex;

        info('Player #' +this.active+' ('+ this.players[this.active].role +') is the new active player');

        // Send the play message to the newly activated player
        this.players[this.active].socket.send({
            type: 'message',
            dstId: this.players[this.active].role,
            msgType: 'start turn',
            content: {
            }
        });
        return true;
    }
};

module.exports = NPlayer;

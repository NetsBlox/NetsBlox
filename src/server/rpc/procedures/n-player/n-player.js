// This is the NPlayer game RPC. It ensures round-robin turn taking with N players.

'use strict';

const logger = require('../utils/logger')('n-player');

/**
 * NPlayer - This constructor is called on the first request to an RPC
 * from a given room
 *
 * @constructor
 * @return {undefined}
 */
const NPlayer = function() {
    this._state = {};
    this._state.active = null;
    this._state.previous = null;
    this._state.players = [];
};

// start the game
NPlayer.prototype.start = function() {

    // populate the players list
    this._state.players = [];

    this._state.players = this.socket._room.sockets().map(socket => {
        return {role: socket.role, socket: socket};
    });

    // set the active player to the current one
    this._state.active = this._state.players.findIndex(player => player.role === this.socket.role);

    logger.info(`Player #${this._state.active} (${this._state.players[this._state.active].role}) is (re)starting a ${this._state.players.length} player game`);

    // Send the start message to everyone
    this._state.players.forEach(player => player.socket.send({
        type: 'message',
        dstId: player.role,
        msgType: 'start game',
        content: {}
    }));

    return true;
};

// get the number of players
NPlayer.prototype.getN = function() {
    return this._state.players.length;
};

// get the active role
NPlayer.prototype.getActive = function() {
    if(this._state.players.length === 0) {
        return '';
    } else {
        return this._state.players[this._state.active].role;
    }
};

// get the previous role
NPlayer.prototype.getPrevious = function() {
    if(this._state.previous == null || this._state.players.length == 0) {
        return '';
    } else {
        return this._state.players[this._state.previous].role;
    }
};

// get the next role
NPlayer.prototype.getNext = function() {
    if(this._state.players.length == 0) {
        return '';
    } else {
        var index = (this._state.active + 1) % this._state.players.length;
        return this._state.players[index].role;
    }
};


// signal end of turn
NPlayer.prototype.endTurn = function(next) {

    if(this._state.active === null || this.socket.role != this._state.players[this._state.active].role ) {
        // bail out if there's no game yet, or if it's somebody else's turn
        return false;
    } else {

        logger.info(`Player #${this._state.active} (${this._state.players[this._state.active].role}) called endTurn`);

        var nextIndex;
        if(next == undefined || next == '') {
            nextIndex = (this._state.active + 1) % this._state.players.length;
        } else {
            nextIndex = this._state.players.findIndex(player => player.role === next);
            if(nextIndex === -1) {
                logger.info('Role ' +next+ ' is not part of the game');
                return false;
            }
        }

        // save previous player's index, and make the next player active
        this._state.previous = this._state.active;
        this._state.active = nextIndex;

        logger.info('Player #' +this._state.active+' ('+ this._state.players[this._state.active].role +') is the new active player');

        // Send the play message to the newly activated player
        this._state.players[this._state.active].socket.send({
            type: 'message',
            dstId: this._state.players[this._state.active].role,
            msgType: 'start turn',
            content: {
            }
        });
        return true;
    }
};

module.exports = NPlayer;

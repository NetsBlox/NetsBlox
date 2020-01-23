/**
 * The NPlayer Service provides helpers RPCs for ensuring round-robin turn taking
 * among the roles in the project's room.
 *
 * Each role will receive a "start game" message at the start and then "start turn"
 * message when it is the given role's turn to act.
 *
 * @service
 * @category Games
 */

'use strict';

const logger = require('../utils/logger')('n-player');
const Utils = require('../utils');

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

NPlayer.prototype.start = async function() {
    this._state.players = await Utils.getRoleIds(this.caller.projectId);
    this._state.active = this._state.players
        .findIndex(roleId => roleId === this.socket.roleId);

    logger.info(`Player #${this._state.active} (${this._state.players[this._state.active]}) is (re)starting a ${this._state.players.length} player game`);

    // Send the start message to everyone
    this.socket.sendMessageToRoom('start game');
    return true;
};

NPlayer.prototype.getN = function() {
    return this._state.players.length;
};

NPlayer.prototype.getActive = function() {
    if(this._state.players.length === 0) {
        return '';
    } else {
        return this._state.players[this._state.active];
    }
};

NPlayer.prototype.getPrevious = function() {
    if(this._state.previous == null || this._state.players.length == 0) {
        return '';
    } else {
        return this._state.players[this._state.previous];
    }
};

NPlayer.prototype.getNext = function() {
    if(this._state.players.length == 0) {
        return '';
    } else {
        const index = (this._state.active + 1) % this._state.players.length;
        const nextId = this._state.players[index];
        return Utils.getRoleName(this.caller.projectId, nextId);
    }
};

NPlayer.prototype.endTurn = function(next) {
    if(this._state.active === null || this.socket.roleId != this._state.players[this._state.active]) {
        // bail out if there's no game yet, or if it's somebody else's turn
        return false;
    } else {

        logger.info(`Player #${this._state.active} (${this._state.players[this._state.active]}) called endTurn`);

        var nextIndex;
        if(next) {
            nextIndex = this._state.players.findIndex(roleId => roleId === next);
            if(nextIndex === -1) {
                logger.info('Role ' +next+ ' is not part of the game');
                return false;
            }
        } else {
            nextIndex = (this._state.active + 1) % this._state.players.length;
        }

        // save previous player's index, and make the next player active
        this._state.previous = this._state.active;
        this._state.active = nextIndex;

        logger.info('Player #' +this._state.active+' ('+ this._state.players[this._state.active]+') is the new active player');

        // Send the play message to the newly activated player
        const player = this._state.players[this._state.active];
        this.socket.sendMessageToRole(player, 'start turn');
        return true;
    }
};

module.exports = NPlayer;

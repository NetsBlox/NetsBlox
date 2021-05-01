/**
 * The Battleship Service provides helpful utilities for building a distributed
 * game of battleship.
 * 
 * Overview
 * --------
 * 
 * Like regular Battleship, the Battleship service has two states: placing ships and shooting at ships.
 * During placement, it expects each role to place each ship on his/her board and will not allow the game to proceed to the shooting phase until each role has placed all his/her ships.
 * Placement, firing and starting blocks will return true if successful or an error message if it fails.
 * 
 * Blocks
 * ------
 * 
 * - ``place <ship> at <row> <column> facing <direction>`` - Places a ship on your board with the front at the given row and column facing the given direction. Returns ``true`` if placed successfully (eg, on the board and not overlapping another ship). Also, placing a ship twice results in a move (not duplicates).
 * - ``start game`` - Try to start the game. If both users have all their ships placed, it should return true and send ``start`` messages to all roles. Otherwise, it will return with a message saying that it is waiting on a specific role.
 * - ``fire at <row> <column>`` - This block allows the user to try to fire at the given row and column. It returns ``true`` if it was a valid move; otherwise it will return an error message like ``it's not your turn!``. On a successful move, the server will send either a ``hit`` or ``miss`` message to everyone in the room. Then it will send a ``your turn`` message to the player to play next.
 * - ``active ships for <role>`` - This block returns a list of all ships that are still afloat for the given role. If no role is specified, it defaults to the sender's role.
 * - ``all ships`` - Returns a list of all ship names. Useful in programmatically placing ships.
 * - ``ship length <ship>`` - Returns the length of the given ship.
 * - ``restart game`` - Restarts the given game (all boards, etc)
 * 
 * Message Types
 * -------------
 * 
 * - ``start`` - Received when ``start game`` finishes successfully for any role. After game has officially started, users can no longer move ships.
 * - ``your turn`` - Received when the given role's turn starts.
 * - ``hit`` - ``role`` is the owner of the ship that has been hit. ``ship`` is the name of the ship that has been hit, and ``row`` and ``column`` provide the location on the board where it was hit. ``sunk`` provides a true/false value for if the ship was sunk.
 * - ``miss`` - ``role`` is the owner of the board receiving the shot and ``row`` and ``column`` correspond to the board location or the shot.
 * 
 * @service
 * @category Games
 */
'use strict';

const logger = require('../utils/logger')('battleship');
const Board = require('./board');
const TurnBased = require('../utils/turn-based');
const BattleshipConstants = require('./constants');
const BOARD_SIZE = BattleshipConstants.BOARD_SIZE;
const SHIPS = BattleshipConstants.SHIPS;
const DIRS = BattleshipConstants.DIRS;
const Utils = require('../utils');
const Projects = require('../../../storage/projects');

var isHorizontal = dir => dir === 'east' || dir === 'west';

class Battleship extends TurnBased {
    constructor () {
        super('fire', 'reset');
        this._state = {};
        this._state._boards = {};
        this._state._STATE = BattleshipConstants.PLACING;
    }
}

var isValidDim = dim => 0 <= dim && dim <= BOARD_SIZE;
var checkRowCol = (row, col) => isValidDim(row) && isValidDim(col);

/**
 * Resets the game by clearing the board and reverting to the placing phase
 * @returns {Boolean} If game was reset
 */
Battleship.prototype.reset = function() {
    this._state._STATE = BattleshipConstants.PLACING;
    this._state._boards = {};
    return true;
};

/**
 * Begins the game, if board is ready
 * @returns {Boolean} If game was started
 */
Battleship.prototype.start = function() {
    // Check that all boards are ready
    var roles = Object.keys(this._state._boards),
        shipsLeft,
        board;

    if (this._state._STATE !== BattleshipConstants.PLACING) {
        return 'Game has already started!';
    }

    if (!roles.length) {
        return 'Waiting on everyone! Place some ships!';
    }

    for (var i = roles.length; i--;) {
        board = this._state._boards[roles[i]];
        shipsLeft = board.shipsLeftToPlace();
        if (shipsLeft !== 0) {
            return `${roles[i]} still needs to place ${shipsLeft} ships`;
        }
    }

    this.socket.sendMessageToRoom('start');
    this._state._STATE = BattleshipConstants.SHOOTING;
    return true;
};

/**
 * Place a ship on the board
 * @param {String} ship Ship type to place
 * @param {BoundedNumber<1,100>} row Row to place ship in
 * @param {BoundedNumber<1,100>} column Column to place ship in
 * @param {String} facing Direction to face
 * @returns {Boolean} If piece was placed
 */
Battleship.prototype.placeShip = function(ship, row, column, facing) {
    var role = this.caller.roleId,
        len = SHIPS[ship];

    row--;
    column--;

    if (this._state._STATE !== BattleshipConstants.PLACING) {
        return 'Cannot move ships after game has started';
    }

    if (!DIRS[facing]) {
        return `Invalid direction "${facing}"`;
    }

    if (!len) {  // no ship found
        return `Invalid ship "${ship}"`;
    }

    // correct for 1 indexing
    var dr = isHorizontal(facing) ? 0 : DIRS[facing]*len-1,
        dc = !isHorizontal(facing) ? 0 : DIRS[facing]*len-1,
        endRow = row + dr,
        endCol = column + dc;

    if (!checkRowCol(row, column) || !checkRowCol(endRow, endCol)) {
        return `Invalid position (${row}, ${column}) to (${endRow},${endCol})`;
    }

    // Create a board if none exists
    if (!this._state._boards[role]) {
        logger.trace(`creating board for ${role}`);
        this._state._boards[role] = new Board(BOARD_SIZE);
    }

    // Place the ship
    var result = this._state._boards[role].placeShip(ship, row, column, endRow, endCol);
    return result || 'Could not place ship - colliding with another ship!';
};

/**
 * Fire a shot at the board
 * @param {BoundedNumber<1,100>} row Row to fire at
 * @param {BoundedNumber<1,100>} column Column to fire at
 * @returns {Boolean} If ship was hit
 */
Battleship.prototype.fire = function(row, column) {
    const role = this.caller.roleId;

    row = row-1;
    column = column-1;
    if (this._state._STATE === BattleshipConstants.PLACING) {
        this.response.send('Cannot fire until game has officially started');
        return false;
    }

    // If target is not provided, try to get another role with a board.
    // If none exists, just try to get another role in the room
    logger.trace('trying to infer a target');
    const roles = Object.keys(this._state._boards);
    if (!roles.length) {
        logger.trace(`no other boards. Checking other roles in the room (${roles})`);
        this.response.send('Cannot fire with only a single player');
        return false;
    }

    const target = roles.filter(r => r !== role).shift();

    logger.trace(`${role} is firing at ${target} (${row}, ${column})`);
    if (!checkRowCol(row, column)) {
        this.response.status(400).send(`Invalid position (${row}, ${column})`);
        return false;
    }

    // Fire at row, col and send messages for:
    //   - hit <target> <ship> <row> <col> <sunk>
    //   - miss <target> <row> <col>
    if (!this._state._boards[target]) {
        logger.error(`board doesn't exist for "${target}"`);
        this._state._boards[target] = new Board(BOARD_SIZE);
    }

    const result = this._state._boards[target].fire(row, column);

    if (result) {
        return Utils.getRoleName(this.caller.projectId, target)
            .then(targetName => {
                const msgType = result.HIT ? BattleshipConstants.HIT : BattleshipConstants.MISS;
                const data = {
                    role: targetName,
                    row: row+1,
                    column: column+1,
                    ship: result.SHIP,
                    sunk: result.SUNK
                };
                this.socket.sendMessageToRoom(msgType, data);
                this.response.send(!!result);
                return !!result;
            });
    }

    this.response.send(!!result);
    return !!result;
};

/**
 * Get number of remaining ships of a role
 * @param {String} roleID Name of role to use
 * @returns {Number} Number of remaining ships
 */
Battleship.prototype.remainingShips = function(roleId) {
    if (roleId) {  // resolve the provided role name to a role ID
        return Projects.getProjectMetadataById(this.caller.projectId)
            .then(metadata => {
                const role = Object.keys(metadata.roles).find(id => {
                    return metadata.roles[id].ProjectName === roleId;
                });

                if (!this._state._boards[role]) {
                    logger.error(`board doesn't exist for "${role}"`);
                    this._state._boards[role] = new Board(BOARD_SIZE);
                }

                return this._state._boards[role].remaining();
            });
    }

    const role = this.caller.roleId;

    if (!this._state._boards[role]) {
        logger.error(`board doesn't exist for "${role}"`);
        this._state._boards[role] = new Board(BOARD_SIZE);
    }

    return this._state._boards[role].remaining();
};

/**
 * Get list of ship types
 * @returns {Array} Types of ships
 */
Battleship.prototype.allShips = function() {
    return Object.keys(SHIPS);
};

/**
 * Get length of a ship type
 * @param {String} ship Type of ship
 * @returns {Number} Length of ship type
 */
Battleship.prototype.shipLength = function(ship) {
    ship = (ship || '').toLowerCase();

    if (!SHIPS[ship]) {
        return `Ship "${ship}" not found!`;
    }
    logger.trace(`request for length of ${ship} (${SHIPS[ship]})`);
    return SHIPS[ship];
};

module.exports = Battleship;


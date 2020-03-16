/**
 * The Battleship Service provides helpful utilities for building a distributed
 * game of battleship.
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


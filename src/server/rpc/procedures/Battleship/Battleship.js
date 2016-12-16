'use strict';

var debug = require('debug'),
    error = debug('NetsBlox:RPCManager:Battleship:error'),
    trace = debug('NetsBlox:RPCManager:Battleship:trace'),
    Board = require('./Board'),
    TurnBased = require('../utils/TurnBased'),
    BattleshipConstants = require('./Constants'),
    Constants = require('../../../../common/Constants'),
    BOARD_SIZE = BattleshipConstants.BOARD_SIZE,
    SHIPS = BattleshipConstants.SHIPS,
    DIRS = BattleshipConstants.DIRS;
    
var isHorizontal = dir => dir === 'east' || dir === 'west';

class Battleship extends TurnBased {
    constructor () {
        super('fire', 'reset');
        this._boards = {};
        this._STATE = BattleshipConstants.PLACING;
    }
}

Battleship.getPath = () => '/battleship';

var isValidDim = dim => 0 <= dim && dim <= BOARD_SIZE;
var checkRowCol = (row, col) => isValidDim(row) && isValidDim(col);

Battleship.prototype.reset = function() {
    this._STATE = BattleshipConstants.PLACING;
    this._boards = {};
    this.response.send(true);
    return true;
};

Battleship.prototype.start = function(req, res) {
    // Check that all boards are ready
    var roles = Object.keys(this._boards),
        sockets = this.socket._room.sockets(),
        shipsLeft,
        board;

    if (this._STATE !== BattleshipConstants.PLACING) {
        return res.send(`Game has already started!`);
    }

    if (!roles.length) {
        return res.send(`Waiting on everyone! Place some ships!`);
    }

    for (var i = roles.length; i--;) {
        board = this._boards[roles[i]];
        shipsLeft = board.shipsLeftToPlace();
        if (shipsLeft !== 0) {
            return res.send(`${roles[i]} still needs to place ${shipsLeft} ships`);
        }
    }

    // If so, send the start! message
    sockets.forEach(s => s.send({
        type: 'message',
        msgType: 'start',
        dstId: Constants.EVERYONE
    }));

    this._STATE = BattleshipConstants.SHOOTING;
    res.send(true);
};

Battleship.prototype.placeShip = function(ship, row, column, facing) {
    var role = this.socket.roleId,
        len = SHIPS[ship];

    row--;
    column--;

    if (this._STATE !== BattleshipConstants.PLACING) {
        return `Cannot move ships after game has started`;
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
    if (!this._boards[role]) {
        trace(`creating board for ${role}`);
        this._boards[role] = new Board(BOARD_SIZE);
    }

    // Place the ship
    var result = this._boards[role].placeShip(ship, row, column, endRow, endCol);
    return result || `Could not place ship - colliding with another ship!`;
};

Battleship.prototype.fire = function(req, res) {
    var row = req.query.row-1,
        col = req.query.column-1,
        socket = req.netsbloxSocket,
        role = socket.roleId,
        roles,
        target = req.query.target;

    if (this._STATE === BattleshipConstants.PLACING) {
        res.send(`Cannot fire until game has officially started`);
        return false;
    }

    // If target is not provided, try to get another role with a board.
    // If none exists, just try to get another role in the room
    if (!target) {
        trace(`trying to infer a target`);
        roles = Object.keys(this._boards);
        if (!roles.length) {
            roles = Object.keys(socket._room.roles);
            trace(`no other boards. Checking other roles in the room (${roles})`);
        }

        target = roles.filter(r => r !== role).shift();
    }

    trace(`${role} is firing at ${target} (${row}, ${col})`);
    if (!checkRowCol(row, col)) {
        res.status(400).send(`Invalid position (${row}, ${col})`);
        return false;
    }

    // Fire at row, col and send messages for:
    //   - hit <target> <ship> <row> <col> <sunk>
    //   - miss <target> <row> <col>
    if (!this._boards[target]) {
        error(`board doesn't exist for "${target}"`);
        this._boards[target] = new Board(BOARD_SIZE);
    }

    var result = this._boards[target].fire(row, col),
        msg;

    if (result) {
        msg = {
            type: 'message',
            dstId: Constants.EVERYONE,
            msgType: result.HIT ? BattleshipConstants.HIT : BattleshipConstants.MISS,
            content: {
                role: target,
                row: row+1,
                column: col+1,
                ship: result.SHIP,
                sunk: result.SUNK
            }
        };

        socket._room.sockets().forEach(s => s.send(msg));
    }

    res.send(!!result);
    return !!result;
};

Battleship.prototype.remainingShips = function(req, res) {
    var role = req.query.roleId || req.netsbloxSocket.roleId;

    if (!this._boards[role]) {
        error(`board doesn't exist for "${role}"`);
        this._boards[role] = new Board(BOARD_SIZE);
    }

    return res.send(this._boards[role].remaining());
};

Battleship.prototype.allShips = function() {
    return Object.keys(SHIPS);
};

Battleship.prototype.shipLength = function(ship) {
    ship = (ship || '').toLowerCase();

    if (!SHIPS[ship]) {
        return `Ship "${ship}" not found!`;
    }
    trace(`request for length of ${ship} (${SHIPS[ship]})`);
    return SHIPS[ship];
};

module.exports = Battleship;

// Board for playing battleship
var SHIPS = require('./constants').SHIPS;
var Board = function(size) {
    this._state = {};
    this._state._ships = [];
    this._state._shots = [];
    for (var i = size; i--;) {
        this._state._shots.push(new Array(size));
        this._state._ships.push(new Array(size));
    }

    this._state._liveShips = {};
    this._state._hits = {};
    Object.keys(SHIPS).forEach(ship => this._state._hits[ship] = 0);
};

Board.prototype.placeShip = function(ship, row, col, erow, ecol) {
    var minRow = Math.min(row, erow),
        minCol = Math.min(col, ecol),
        maxCol = Math.max(col, ecol),
        r,c;

    // If already placed the boat, remove it!
    this._remove(ship);

    // Check that the spots are open
    for (r = Math.max(row, erow); r >= minRow; r--) {
        for (c = maxCol; c >= minCol; c--) {
            if (this._state._ships[r][c]) {
                return false;
            }
        }
    }

    for (r = Math.max(row, erow); r >= minRow; r--) {
        for (c = maxCol; c >= minCol; c--) {
            this._state._ships[r][c] = ship;
        }
    }

    this._state._liveShips[ship] = true;
    return true;
};

Board.prototype._remove = function(ship) {
    for (var r = this._state._ships.length; r--;) {
        for (var c = this._state._ships[r].length; c--;) {
            if (this._state._ships[r][c] === ship) {
                this._state._ships[r][c] = null;
            }
        }
    }
};

Board.prototype.fire = function(row, col) {
    var result = {},
        ship;

    // Check if it is a reshoot?
    if (this._state._shots[row][col]) {
        return null;
    }

    // Check if it hit a ship
    if (ship = this._state._ships[row][col]) {
        result.HIT = true;
        result.SHIP = ship;
        this._state._hits[ship]++;

        // Check if the ship sank
        if (this._state._hits[ship] === SHIPS[ship]) {
            result.SUNK = true;
            this._state._liveShips[ship] = false;
        }
    }

    this._state._shots[row][col] = true;
    return result;
};

Board.prototype.remaining = function() {
    return Object.keys(this._state._liveShips).filter(ship => this._state._liveShips[ship]);
};

Board.prototype.shipsLeftToPlace = function() {
    return Object.keys(SHIPS).length - Object.keys(this._state._liveShips).length;
};

module.exports = Board;

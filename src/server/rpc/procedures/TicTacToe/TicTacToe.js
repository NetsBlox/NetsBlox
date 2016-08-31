// This is the TicTacToe RPC. It will maintain the game board and can be queried 
// for win/tie/ongoing as well as turn

'use strict';

var R = require('ramda'),
    debug = require('debug'),
    log = debug('NetsBlox:RPCManager:TicTacToe:log'),
    trace = debug('NetsBlox:RPCManager:TicTacToe:trace'),
    Constants = require('../../../../common/Constants'),
    info = debug('NetsBlox:RPCManager:TicTacToe:info');

/**
 * TicTacToeRPC - This constructor is called on the first request to an RPC
 * from a given room
 *
 * @constructor
 * @return {undefined}
 */
var TicTacToeRPC = function() {
    this.board = TicTacToeRPC.getNewBoard();
    this._winner = null;
    this.lastMove = null;
};

/**
 * Return the path to the given RPC
 *
 * @return {String}
 */
TicTacToeRPC.getPath = function() {
    return '/tictactoe';
};

/**
 * This function is used to expose the public API for RPC calls
 *
 * @return {Array<String>}
 */
TicTacToeRPC.getActions = function() {
    return ['winner',  // Get the winner
            'clear',  // Clear the board
            'play',  // Play a tile at the given location
            'isOpen',  // for testing
            'isGameOver'];  // Check for game over
};

// Actions
TicTacToeRPC.prototype.clear = function(req, res) {
    var roleId = req.netsbloxSocket.roleId;

    this._winner = null;
    this.lastMove = null;
    this.board = TicTacToeRPC.getNewBoard();
    info(req.query.roleId+' is clearing board');
    res.status(200).send(true);
};

TicTacToeRPC.prototype.winner = function(req, res) {
    res.send(this._winner);
};

TicTacToeRPC.prototype.isOpen = function(req, res) {
    var row = req.query.row-1,
        column = req.query.column-1,
        isValid = [row, column].map(n => n > -1 && n < 3),
        open;

    isValid = [row, column].map(n => n > -1 && n < 3);
    if (isValid[0] && isValid[1]) {
        open = this.board[row][column] === null;
        return res.send(open);
    }

    return res.status(400).send('bad position');
};

TicTacToeRPC.prototype.play = function(req, res) {
    var row = req.query.row-1,
        column = req.query.column-1,
        roleId = req.netsbloxSocket.roleId,
        open = this.board[row][column] === null,
        isOnBoard = [row, column].every(this.isValidPosition.bind(this));

    trace('"'+roleId+'" is trying to play at '+row+','+column+'. Board is \n'+
        this.board.map(function(row) {
            return row.map(t => t || '_').join(' ');
    })
    .join('\n'));
    // Check that...

    // ...the game is still going
    if (this._winner) {
        log('"'+roleId+'" is trying to play after the game is over');
        return res.status(400).send(false);
    }

    // ...it's a valid position
    if (!isOnBoard) {
        log('"'+roleId+'" is trying to play in an invalid position ('+row+','+column+')');
        return res.status(400).send(false);
    }

    // ...it is the given role's turn
    if (this.lastMove === roleId) {
        log('"'+roleId+'" is trying to play twice in a row!');
        return res.status(400).send(false);
    }

    // ...it's not occupied
    if (open) {
        this.board[row][column] = roleId;
        this._winner = TicTacToeRPC.getWinner(this.board);
        trace('"'+roleId+'" successfully played at '+row+','+column);
        // Send the play message to everyone!
        req.netsbloxSocket._room.sockets()
            .forEach(socket => socket.send({
                type: 'message',
                dstId: Constants.EVERYONE,
                msgType: 'TicTacToe',
                content: {
                    row: row+1,
                    column: column+1,
                    role: roleId
                }
            }));

        this.lastMove = roleId;
        return res.status(200).send(true);
    }
    return res.status(400).send(false);
};

TicTacToeRPC.prototype.isGameOver = function(req, res) {
    var isOver = false;

    // Game is over if someone has won
    isOver = this._winner !== null;

    // or all tiles are filled
    isOver = isOver || this.isFullBoard();

    log('isGameOver: ' + isOver + ' (' + this._winner + ')');
    res.send(isOver);
};

// Helper functions
/**
 * Get the winner from the given board layout.
 *
 * @param board
 * @return {String} winner
 */
TicTacToeRPC.getWinner = function(board) {
    var possibleWinners = [];
    // Check for horizontal wins
    possibleWinners.push(TicTacToeRPC.getHorizontalWinner(board));

    // Check vertical
    var rotatedBoard = TicTacToeRPC.rotateBoard(board);
    possibleWinners.push(TicTacToeRPC.getHorizontalWinner(rotatedBoard));

    // Check diagonals
    var flippedBoard = board.map(function(row) {
        return row.slice().reverse();
    });
    possibleWinners.push(TicTacToeRPC.getDiagonalWinner(board) || 
        TicTacToeRPC.getDiagonalWinner(flippedBoard));

    return possibleWinners.reduce(function(prev, curr) {
        return prev || curr;
    }, null);
};

TicTacToeRPC.getNewBoard = function() {
    return [
        [null, null, null],
        [null, null, null],
        [null, null, null]
    ];
};

TicTacToeRPC.rotateBoard = function(board) {
    var rotatedBoard = TicTacToeRPC.getNewBoard();
    for (var row = 0; row < board.length; row++) {
        for (var col = 0; col < board[row].length; col++) {
            rotatedBoard[col][row] = board[row][col];
        }
    }
    return rotatedBoard;
};

TicTacToeRPC.prototype.isFullBoard = function() {
    for (var i = this.board.length; i--;) {
        for (var j = this.board[i].length; j--;) {
            if (this.board[i][j] === null) {
                return false;
            }
        }
    }
    return true;
};

TicTacToeRPC.getDiagonalWinner = function(board) {
    var items;

    // Get the diagonal
    items = [1,2,3]
        .map(R.nthArg(1))
        .map(function(i) {
            return board[i][i];
        });

    // Test it
    if (TicTacToeRPC.areEqualNonNull(items)) {
        return items[0];
    }
    return null;
};

TicTacToeRPC.getHorizontalWinner = function(board) {
    for (var i = 0; i < board.length; i++) {
        if (TicTacToeRPC.areEqualNonNull(board[i])) {
            return board[i][0];
        }
    }
    return null;
};

/**
 * Check if it is in the range of the board and a number
 *
 * @param {Number} pos
 * @return {Boolean}
 */
TicTacToeRPC.prototype.isValidPosition = function(pos) {
    return !isNaN(pos) && 0 <= pos && pos < this.board.length;
};

TicTacToeRPC.areEqualNonNull = function(row) {
    return row[0] && row[0] === row[1] && row[1] === row[2];
};

module.exports = TicTacToeRPC;

/**
 * The ConnectN Service provides helpers for building games like Connect-4 and Tic-Tac-Toe.
 *
 * @service
 * @category Games
 */

'use strict';

const logger = require('../utils/logger')('connect-n');
const Utils = require('../utils');

const ConnectN = function() {
    this._state = {};
    this._state.board = ConnectN.getNewBoard();
    this._state._winner = null;
    this._state.lastMove = null;
};

/**
 * Create a new ConnectN game
 * @param {Number=} row The number of rows on the game board
 * @param {Number=} column The number of columns on the game board
 * @param {Number=} numDotsToConnect The number of connected tiles required to win
 */
ConnectN.prototype.newGame = function(row, column, numDotsToConnect) {
    this._state.numRow = row || 3;
    this._state.numCol = column || 3;
    this._state.numDotsToConnect = numDotsToConnect;
    this._state._winner = null;
    this._state.lastMove = null;

    if(this._state.numRow < 3)
        this._state.numRow = 3;
    if(this._state.numCol < 3)
        this._state.numCol = 3;

    this._state.numDotsToConnect = Math.min(Math.max(this._state.numRow, this._state.numCol), this._state.numDotsToConnect);

    logger.info(this.caller.roleId+' is clearing board and creating a new one with size: ', this._state.numRow, ', ', this._state.numCol);
    this._state.board = ConnectN.getNewBoard(this._state.numRow, this._state.numCol);

    const msgContents = {
        row: this._state.numRow,
        column: this._state.numCol,
        numDotsToConnect: this._state.numDotsToConnect
    };
    this.socket.sendMessageToRoom('start', msgContents);

    return `Board: ${this._state.numRow}x${this._state.numCol} Total dots to connect: ${this._state.numDotsToConnect}`;
};



/**
 * Play at the given row, column to occupy the location.
 * @param {Number} row The given row at which to move
 * @param {Number} column The given column at which to move
 */
ConnectN.prototype.play = async function(row, column) {
    const {projectId, roleId} = this.caller;
    if (this._state._winner) {
        throw new Error('The game is over!');
    }

    if (this._state.lastMove === roleId) {
        throw new Error('Trying to play twice in a row!');
    }

    let isOnBoard = false;
    // ...check played on board
    if(row < this._state.board.length && row >= 0)
        if(column < this._state.board[0].length && column >= 0)
            isOnBoard = true;


    // ...it's a valid position
    if (!isOnBoard) {
        throw new Error('Trying to play at invalid position!');
    }

    // ...it's not occupied
    const isOccupied = this._state.board[row][column] !== null;
    if (isOccupied) {
        throw new Error('Position is already occupied!');
    }

    this._state.board[row][column] = roleId;

    const winnerId = ConnectN.getWinner(this._state.board, this._state.numDotsToConnect);
    this._state._winner = winnerId;

    const roleNames = await Utils.getRoleNames(projectId, [roleId, winnerId]);
    // Send the play message to everyone!
    const [roleName, winnerRoleName] = roleNames;
    const msgContents = {
        row: row,
        column: column,
        role: roleName
    };
    this.socket.sendMessageToRoom('play', msgContents);
    this._state.lastMove = roleId;

    if(this.isGameOver()) {
        const msgContents = {
            winner: winnerRoleName
        };
        this.socket.sendMessageToRoom('gameOver', msgContents);
        this._state.lastMove = roleId;
    }
};

/**
 * Check if the current game is over.
 */
ConnectN.prototype.isGameOver = function() {
    var isOver = false;

    // Game is over if someone has won
    isOver = this._state._winner !== null;

    // or all tiles are filled
    var isDraw = this.isFullBoard();
    isOver = isOver || isDraw;
    if(isDraw)
        this._state._winner = 'DRAW';
    logger.log('isGameOver: ' + isOver + ' (' + this._state._winner + ')');
    return isOver;
};

/**
 * Check if every position on the current board is occupied.
 */
ConnectN.prototype.isFullBoard = function() {
    for (var i = this._state.board.length; i--;) {
        for (var j = this._state.board[i].length; j--;) {
            if (this._state.board[i][j] === null) {
                return false;
            }
        }
    }
    return true;
};

// Helper functions
ConnectN.getWinner = function(board, numDotsToConnect) {
    var possibleWinners = [];
    // Check for horizontal wins
    possibleWinners.push(ConnectN.getHorizontalWinner(board, numDotsToConnect));

    // Check vertical
    var rotatedBoard = ConnectN.rotateBoard(board);
    possibleWinners.push(ConnectN.getHorizontalWinner(rotatedBoard, numDotsToConnect));


    // Check diagonals
    var flippedBoard = board.map(function(row) {
        return row.slice().reverse();
    });
    possibleWinners.push(ConnectN.getDiagonalWinner(board, numDotsToConnect) ||
        ConnectN.getDiagonalWinner(flippedBoard, numDotsToConnect));



    return possibleWinners.reduce(function(prev, curr) {
        return prev || curr;
    }, null);
};

ConnectN.getNewBoard = function(row, col) {
    var board = [];
    for(var x = 0; x < row; x++){
        board[x] = [];
        for(var y = 0; y < col; y++){
            board[x][y] = null;
        }
    }
    return board;
};

ConnectN.rotateBoard = function(board) {
    var rotatedBoard = ConnectN.getNewBoard(board[0].length, board.length);
    for (var row = 0; row < board.length; row++) {
        for (var col = 0; col < board[row].length; col++) {
            rotatedBoard[col][row] = board[row][col];
        }
    }
    return rotatedBoard;
};

ConnectN.getDiagonalWinner = function(board, numDotsToConnect) {
    var row = board.length;
    var col = board[0].length;
    var j = 0;
    var i = 0;
    var res;
    for(j = 0, i = 0; j < col; j++){
        res = ConnectN.getDiagonalWinnerFromStartPoint(board, numDotsToConnect, i, j);
        if(res !== null)
            return res;
    }
    for(j = 0, i = 1; i < row; i++){
        res = ConnectN.getDiagonalWinnerFromStartPoint(board, numDotsToConnect, i, j);
        if(res !== null)
            return res;
    }
    return null;
};


ConnectN.getDiagonalWinnerFromStartPoint = function(board, numDotsToConnect, i, j) {

    var listDots = [];
    var row = board.length;
    var col = board[0].length;
    for (; i < row && j < col; i++, j++) {
        listDots.push(board[i][j]);
    }

    if (listDots.length >= numDotsToConnect) {
        return ConnectN.getRowWinner(listDots, numDotsToConnect);
    }

    return null;
};

ConnectN.getHorizontalWinner = function(board, numDotsToConnect) {
    for (var i = 0; i < board.length; i++) {
        var res = ConnectN.getRowWinner(board[i], numDotsToConnect);
        if (res !== null)
            return res;
    }
    return null;
};

ConnectN.getRowWinner = function(row, numDotsToConnect){

    var symbol1 = null;
    var si = 0;
    var s;
    for (; si < row.length; si++){
        s = row[si];
        if( s !== null){
            symbol1 = s;
            break;
        }
    }
    var symbol2 = null;

    for (; si < row.length; si++) {
        s = row[si];
        if (s !== null && s !== symbol1) {
            symbol2 = s;
            break;
        }
    }

    if (symbol1 != null) {
        if (ConnectN.areEqualNonNull(row, symbol1, numDotsToConnect)) {
            return symbol1;
        }
    }
    if(symbol2 !== null){
        if (ConnectN.areEqualNonNull(row, symbol2, numDotsToConnect)) {
            return symbol2;
        }
    }
    return null;
};

ConnectN.areEqualNonNull = function (row, symbol, numDotsToConnect) {
    var n = numDotsToConnect;
    for (var s = 0; s < row.length - n + 1; s++) {
        var consecutiveDots = 0;
        for (var i = s; i < row.length; i++) {
            if (symbol === row[i]) {
                consecutiveDots++;
                if (consecutiveDots >= n)
                    return true;
            }
            else
                break;
        }
    }
    return false;
};

module.exports = ConnectN;

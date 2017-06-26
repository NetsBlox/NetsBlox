// This is the ConnectN RPC. It will maintain the game board and can be queried
// for win/tie/ongoing as well as turn

'use strict';

var debug = require('debug'),
    log = debug('netsblox:rpc:connect-n:log'),
    trace = debug('netsblox:rpc:connect-n:trace'),
    Constants = require('../../../../common/constants'),
    info = debug('netsblox:rpc:connect-n:info');

/**
 * ConnectN - This constructor is called on the first request to an RPC
 * from a given room
 *
 * @constructor
 * @return {undefined}
 */
var ConnectN = function() {
    this._state.board = ConnectN.getNewBoard();
    this._state._winner = null;
    this._state.lastMove = null;
};

/**
 * Return the path to the given RPC
 *
 * @return {String}
 */
ConnectN.getPath = function() {
    return '/connectn';
};

// Actions
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

    info(this.socket.roleId+' is clearing board and creating a new one with size: ', this._state.numRow, ', ', this._state.numCol);
    this._state.board = ConnectN.getNewBoard(this._state.numRow, this._state.numCol);

    this.socket._room.sockets()
        .forEach(socket => socket.send({
            type: 'message',
            msgType: 'start',
            dstId: Constants.EVERYONE,
            content: {
                row: this._state.numRow,
                column: this._state.numCol,
                numDotsToConnect: this._state.numDotsToConnect
            }
        }));

    return `Board: ${this._state.numRow}x${this._state.numCol} Total dots to connect: ${this._state.numDotsToConnect}`;
};



ConnectN.prototype.play = function(row, column) {
    // ...the game is still going
    if (this._state._winner) {
        log('"'+roleId+'" is trying to play after the game is over');
        return 'The game is over!';
    }

    var roleId = this.socket.roleId,
        open = false,
        isOnBoard = false;

    // ...it is the given role's turn
    if (this._state.lastMove === roleId) {
        log('"'+roleId+'" is trying to play twice in a row!');
        return 'Trying to play twice in a row!';
    }


    // ...check played on board
    if(row < this._state.board.length && row >= 0)
        if( column < this._state.board[0].length && column >= 0)
            isOnBoard = true;


    // ...it's a valid position
    if (!isOnBoard) {
        log('"'+roleId+'" is trying to play in an invalid position ('+row+','+column+')');
        return 'Trying to play at invalid position!';
    }


    trace('"'+roleId+'" is trying to play at '+row+','+column+'. Board is \n'+
        this._state.board.map(function(row) {
            return row.map(t => t || '_').join(' ');
        })
            .join('\n'));

    // ...it's not occupied
    open = this._state.board[row][column] === null;
    if (open) {
        this._state.board[row][column] = roleId;
        this._state._winner = ConnectN.getWinner(this._state.board, this._state.numDotsToConnect);
        trace('"'+roleId+'" successfully played at '+row+','+column);
        // Send the play message to everyone!
        this.socket._room.sockets()
            .forEach(socket => socket.send({
                type: 'message',
                dstId: Constants.EVERYONE,
                msgType: 'play',
                content: {
                    row: row,
                    column: column,
                    role: roleId
                }
            }));

        this._state.lastMove = roleId;


        trace('"'+roleId+'" is after playing at '+row+','+column+'. Board is \n'+
            this._state.board.map(function(row) {
                return row.map(t => t || '_').join(' ');
            })
                .join('\n'));


        if(this.isGameOver())
        {
            this.socket._room.sockets()
                .forEach(socket => socket.send({
                    type: 'message',
                    dstId: Constants.EVERYONE,
                    msgType: 'gameOver',
                    content: {
                        winner: this._state._winner
                    }
                }));
        }

        return '';
    }
    return 'Play was not successful!';
};

ConnectN.prototype.isGameOver = function() {
    var isOver = false;

    // Game is over if someone has won
    isOver = this._state._winner !== null;

    // or all tiles are filled
    var isDraw = this.isFullBoard();
    isOver = isOver || isDraw;
    if(isDraw)
        this._state._winner = 'DRAW';
    log('isGameOver: ' + isOver + ' (' + this._state._winner + ')');
    return isOver;
};

// Helper functions
/**
 * Get the winner from the given board layout.
 *
 * @param board
 * @return {String} winner
 */
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

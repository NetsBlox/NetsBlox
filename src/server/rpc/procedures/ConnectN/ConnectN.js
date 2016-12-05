// This is the ConnectN RPC. It will maintain the game board and can be queried
// for win/tie/ongoing as well as turn

'use strict';

var debug = require('debug'),
    log = debug('NetsBlox:RPCManager:ConnectN:log'),
    trace = debug('NetsBlox:RPCManager:ConnectN:trace'),
    Constants = require('../../../../common/Constants'),
    info = debug('NetsBlox:RPCManager:ConnectN:info');

/**
 * ConnectN - This constructor is called on the first request to an RPC
 * from a given room
 *
 * @constructor
 * @return {undefined}
 */
var ConnectN = function() {
    this.board = ConnectN.getNewBoard();
    this._winner = null;
    this.lastMove = null;
};

/**
 * Return the path to the given RPC
 *
 * @return {String}
 */
ConnectN.getPath = function() {
    return '/connectn';
};

/**
 * This function is used to expose the public API for RPC calls
 *
 * @return {Array<String>}
 */
ConnectN.getActions = function() {
    return [
        'newGame',  // Clear the board
        'play'  // Play a tile at the given location
    ];
};

// Actions
ConnectN.prototype.newGame = function(req, res) {
    this.numRow = req.query.row || 3;
    this.numCol = req.query.column || 3;
    this.numDotsToConnect = req.query.numDotsToConnect;
    this._winner = null;
    this.lastMove = null;

    if(this.numRow < 3)
        this.numRow = 3;
    if(this.numCol < 3)
        this.numCol = 3;

    this.numDotsToConnect = Math.min(Math.max(this.numRow, this.numCol), this.numDotsToConnect);

    info(req.query.roleId+' is clearing board and creating a new one with size: ', this.numRow, ', ', this.numCol);
    this.board = ConnectN.getNewBoard(this.numRow, this.numCol);

    req.netsbloxSocket._room.sockets()
        .forEach(socket => socket.send({
            type: 'message',
            msgType: 'start',
            dstId: Constants.EVERYONE,
            content: {
                row: this.numRow,
                column: this.numCol,
                numDotsToConnect: this.numDotsToConnect
            }
        }));

    res.status(200).send('Board: ' + this.numRow + 'x' + this.numCol + ' Total dots to connect: ' + this.numDotsToConnect);
};



ConnectN.prototype.play = function(req, res) {
    // ...the game is still going
    if (this._winner) {
        log('"'+roleId+'" is trying to play after the game is over');
        return res.status(400).send('The game is over!');
    }

    var row = req.query.row,
        column = req.query.column,
        roleId = req.netsbloxSocket.roleId,
        open = false,
        isOnBoard = false;

    // ...it is the given role's turn
    if (this.lastMove === roleId) {
        log('"'+roleId+'" is trying to play twice in a row!');
        return res.status(400).send('Trying to play twice in a row!');
    }


    // ...check played on board
    if(row < this.board.length && row >= 0)
        if( column < this.board[0].length && column >= 0)
            isOnBoard = true;


    // ...it's a valid position
    if (!isOnBoard) {
        log('"'+roleId+'" is trying to play in an invalid position ('+row+','+column+')');
        return res.status(400).send('Trying to play at invalid position!');
    }


    trace('"'+roleId+'" is trying to play at '+row+','+column+'. Board is \n'+
        this.board.map(function(row) {
            return row.map(t => t || '_').join(' ');
        })
            .join('\n'));

    // ...it's not occupied
    open = this.board[row][column] === null;
    if (open) {
        this.board[row][column] = roleId;
        this._winner = ConnectN.getWinner(this.board, this.numDotsToConnect);
        trace('"'+roleId+'" successfully played at '+row+','+column);
        // Send the play message to everyone!
        req.netsbloxSocket._room.sockets()
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

        this.lastMove = roleId;


        trace('"'+roleId+'" is after playing at '+row+','+column+'. Board is \n'+
            this.board.map(function(row) {
                return row.map(t => t || '_').join(' ');
            })
                .join('\n'));


        if(this.isGameOver())
        {
            req.netsbloxSocket._room.sockets()
                .forEach(socket => socket.send({
                    type: 'message',
                    dstId: Constants.EVERYONE,
                    msgType: 'gameOver',
                    content: {
                        winner: this._winner
                    }
                }));
        }

        return res.status(200).send('');
    }
    return res.status(400).send('Play was not successful!');
};

ConnectN.prototype.isGameOver = function() {
    var isOver = false;

    // Game is over if someone has won
    isOver = this._winner !== null;

    // or all tiles are filled
    var isDraw = this.isFullBoard();
    isOver = isOver || isDraw;
    if(isDraw)
        this._winner = 'DRAW';
    log('isGameOver: ' + isOver + ' (' + this._winner + ')');
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
    for (var i = this.board.length; i--;) {
        for (var j = this.board[i].length; j--;) {
            if (this.board[i][j] === null) {
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

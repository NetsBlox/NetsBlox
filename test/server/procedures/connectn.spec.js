/*globals describe,it,before,beforeEach,afterEach*/
'use strict';

var ConnectN = require('../../../src/server/rpc/procedures/ConnectN/ConnectN.js'),
    RPCMock = require('../../assets/MockRPC'),
    connectn = new RPCMock(ConnectN),
    assert = require('assert');

// Quick mocks for express req, res objects

describe('ConnectN Tests', function() {

    describe('newGame', function() {
        it('should detect invalid number for rows', function() {
            var result = connectn.newGame({row: -4});
            assert.notEqual(result.code, 200);
        });

        it('should detect invalid number for column', function() {
            var result = connectn.newGame({column: -4});
            assert.notEqual(result.code, 200);
        });

        it('should default to 3 rows; 3 columns', function() {
            var result = connectn.newGame(),
                board = connectn._rpc.board;

            assert.equal(board.length, 3);
            assert.equal(board[0].length, 3);
        });
    });

    describe('play', function() {
        afterEach(function() {
            connectn.newGame();
        });
        beforeEach(function() {
            connectn.newGame();
        });

        it('should not reverse the board', function() {
            connectn.play({uuid: 'p1', row: 3, column: 3});
            assert(!connectn.isOpen({row: 3, column: 3}).response);
            assert(connectn.isOpen({row: 3, column: 1}).response);
        });

        it('should not play in bad position', function() {
            var code = connectn.play({uuid: 'p1', row: 3, column: -1}).code;
            assert.equal(code, 400);
        });

        it('should not play if winner is found', function() {
            var code;
            connectn._rpc._winner = 'cat';
            code = connectn.play({uuid: 'p1', row: 3, column: -1}).code;
            assert.equal(code, 400);
        });
    });

    describe('clear', function() {
        it('should clear a move', function() {
            connectn.play({uuid: 'p1', row: 3, column: 3});
            connectn.clear();
            assert(connectn.isOpen({row: 3, column: 3}).response);
            assert(connectn.isOpen({row: 3, column: 1}).response);
        });
    });

    describe('isOpen', function() {
        beforeEach(function() {
            connectn.clear();
        });

        it('should be 1 indexed', function() {
            assert(connectn.play({uuid: 'p1', row: 3, column: 3}).response);
        });

        it('should return 400 if bad position', function() {
            var code = connectn.isOpen({uuid: 'p1', row: 5, column: 3}).code;
            assert.equal(code, 400);
        });

        it('should detect that every tile is open to start', function() {
            for (var i = 1; i < 4; i++) {
                for (var j = 1; j < 4; j++) {
                    var res = connectn.isOpen({row: i, column: j});
                    assert(res.response, 'Not open: '+JSON.stringify(res));
                }
            }
        });
    });

    describe('getWinner', function() {
        beforeEach(function() {
            connectn.clear();
        });

        it('should detect horizontal victory', function() {
            var uuid = 'p2',
                columns = [1,2,3],
                row = 3;

            columns.forEach(function(col) {
                connectn._rpc.lastMove = null;  // reset turns
                connectn.play({uuid: uuid, row: row, column: col});
            });
            assert(connectn.winner({uuid: uuid}).response);
        });

        it('should detect vertical victory', function() {
            var uuid = 'p2',
                rows = [1,2,3],
                col = 2;

            rows.forEach(function(row) {
                connectn._rpc.lastMove = null;  // reset turns
                connectn.play({uuid: uuid, row: row, column: col});
            });
            assert(connectn.winner({uuid: uuid}).response);
        });

        it('should detect diagonal victory', function() {
            var uuid = 'p2',
                positions = [[1,3],[2,2],[3,1]];

            positions.forEach(function(pos) {
                connectn._rpc.lastMove = null;  // reset turns
                connectn.play({uuid: uuid, row: pos[0], column: pos[1]});
            });
            assert(connectn.winner({uuid: uuid}).response);
        });
    });

    describe('isGameOver', function() {
        beforeEach(function() {
            var uuid = 'p2',
                columns = [1,2,3],
                row = 3;

            columns.forEach(function(col) {
                connectn.play({uuid: uuid, row: row, column: col});
            });
            assert(connectn.isGameOver().response);
        });

        it('should detect game over after victory', function() {
            assert(connectn.isGameOver().response);
        });

        it('should reset after clear', function() {
            connectn.clear();
            assert(!connectn.isGameOver().response);
        });
    });
});

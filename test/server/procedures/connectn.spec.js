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
            var result = connectn.newGame({row: -4}),
                board = connectn._rpc.board;
            assert.equal(board.length, 3);
        });

        it('should detect invalid number for column', function() {
            var result = connectn.newGame({column: -4}),
                board = connectn._rpc.board;
            assert.equal(board[0].length, 3);
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

        it('should support non-square board', function() {
            var code;

            connectn.newGame({row: 3, column: 5});
            code = connectn.play({uuid: 'p1', row: 1, column: 1}).code;

            assert.equal(code, 200);
        });
    });



});

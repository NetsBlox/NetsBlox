/*globals describe,it,before,beforeEach,afterEach*/
'use strict';

// Quick mocks for express req, res objects

describe('ConnectN Tests', function() {

    var ConnectN = require('../../../../src/server/rpc/procedures/connect-n/connect-n.js'),
        RPCMock = require('../../../assets/mock-rpc'),
        assert = require('assert'),
        connectn;

    before(function() {
        connectn = new RPCMock(ConnectN);
    });

    describe('newGame', function() {
        it('should detect invalid number for rows', function() {
            var board;

            connectn.newGame(-4),
            board = connectn._rpc._state.board;
            assert.equal(board.length, 3);
        });

        it('should detect invalid number for column', function() {
            var board;

            connectn.newGame(null, -4);
            board = connectn._rpc._state.board;
            assert.equal(board[0].length, 3);
        });

        it('should default to 3 rows; 3 columns', function() {
            var board = connectn._rpc._state.board;

            connectn.newGame();
            assert.equal(board.length, 3);
            assert.equal(board[0].length, 3);
        });
    });

    describe('play', function() {
        afterEach(function() {
            connectn.newGame();
        });
        beforeEach(function() {
            connectn.socket.roleId = 'test';
            connectn.newGame();
        });

        it('should not play in bad position', function() {
            connectn.socket.roleId = 'p1';
            var result = connectn.play(3, -1);
            assert.notEqual(result.indexOf('invalid position'), -1);
        });

        it('should not play if winner is found', function() {
            var result;

            connectn._rpc._state._winner = 'cat';
            connectn.socket.roleId = 'p1';

            result = connectn.play(3, -1);
            assert.notEqual(result.indexOf('game is over'), -1);
        });

        it('should support non-square board', function() {
            var error;

            connectn.newGame(3, 5);
            connectn.socket.roleId = 'p1';
            error = connectn.play(1, 1);

            assert(!error);
        });
    });



});

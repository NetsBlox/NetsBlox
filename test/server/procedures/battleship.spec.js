var Battleship = require('../../../src/server/rpc/procedures/Battleship/Battleship.js'),
    RPCMock = require('../../assets/MockRPC'),
    battleship = new RPCMock(Battleship),
    assert = require('assert');

// Quick mocks for express req, res objects

describe('Battleship Tests', function() {
    describe('basic commands', function() {
        it('should be able to call reset', function() {
            battleship.reset();
        });

        it('should be able to query ship sizes', function() {
            var len = battleship.shipLength({ship: 'Battleship'}).response;
            assert.equal(len, 4);
        });
        
        it('should be able to query ship names', function() {
            var ships = battleship.allShips().response;
            assert.equal(ships.length, 5);
            assert.equal(ships.sort()[0], 'aircraft carrier');
        });
    });

    describe('placing ships', function() {
        beforeEach(function() {
            battleship.reset();
        });

        describe('errors', function() {
            it('should return false for invalid/missing dir', function() {
                var result = battleship.placeShip().response;
                assert.notEqual(result.indexOf('Invalid direction'), -1, result);
            });

            it('should return false for invalid ship names', function() {
                var opts,
                    result;

                opts = {
                    facing: 'north',
                    ship: 'asdf'
                };

                result = battleship.placeShip(opts).response;
                assert.notEqual(result.indexOf('Invalid ship'), -1, result);
            });

            it('should error for bad row/col', function() {
                var opts,
                    result;

                opts = {
                    row: 1,  // missing col
                    facing: 'north',
                    ship: 'asdf'
                };

                result = battleship.placeShip(opts).response;
                assert.notEqual(result.indexOf('Invalid ship'), -1, result);
            });

            it('should be 1 indexed', function() {
                var opts,
                    result;

                opts = {
                    facing: 'north',
                    row: 0,
                    column: 2,
                    ship: 'destroyer'
                };

                result = battleship.placeShip(opts).response;
                assert.notEqual(result.indexOf('Invalid position'), -1, result);
            });
        });

        describe('destroyer test', function() {
            var board,
                row = 1,
                col = 2;

            beforeEach(function() {
                var opts,
                    result;

                opts = {
                    roleId: 'test',
                    facing: 'north',
                    row,
                    column: col,
                    ship: 'destroyer'
                };

                result = battleship.placeShip(opts).response;
                console.log('result:', result);
                // Check the spots!
                board = battleship._rpc._boards.test;
            });

            it('should place destroyer w/ correct name', function() {
                var name = board._ships[row-1][col-1];  // correcting for 1 indexing
                assert.equal(name, 'destroyer');
            });

            it('should place destroyer w/ correct length', function() {
                var occupied = board._ships
                    .reduce((count, row) => count + row.reduce((c, i) => c + !!i, 0), 0);

                assert.equal(occupied, 3);
            });

            it('should fail if overlapping boats', function() {
                var opts, result;

                opts = {
                    roleId: 'test',
                    facing: 'north',
                    row: row+1,
                    column: col,
                    ship: 'battleship'
                };

                result = battleship.placeShip(opts).response;
                assert.notEqual(result.indexOf('colliding with another'), -1);
            });

            it('should move boat if placing same boat twice', function() {
                var opts,
                    result,
                    oldPosition;

                opts = {
                    roleId: 'test',
                    facing: 'west',
                    row: row,
                    column: col+1,
                    ship: 'destroyer'
                };

                result = battleship.placeShip(opts).response;
                oldPosition = board._ships[row-1][col-1];  // correcting for 1 indexing
                assert.notEqual(oldPosition, 'destroyer');
            });
        });

    });
});

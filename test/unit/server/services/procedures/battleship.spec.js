const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    const Battleship = utils.reqSrc('services/procedures/battleship/battleship');
    const RPCMock = require('../../../../assets/mock-service');
    const assert = require('assert');
    let battleship;

    before(function() {
        battleship = new RPCMock(Battleship);
    });
    after(() => battleship.destroy());

    utils.verifyRPCInterfaces('Battleship', [
        ['start'],
        ['reset'],
        ['allShips'],
        ['shipLength', ['ship']],
        ['placeShip', ['ship', 'row', 'column', 'facing']],
        ['fire', ['row', 'column']],
        ['remainingShips', ['roleID']]
    ]);

    describe('basic commands', function() {
        it('should be able to call reset', function() {
            battleship.reset();
        });

        it('should be able to query ship sizes', function() {
            var len = battleship.shipLength('Battleship');
            assert.equal(len, 4);
        });

        it('should be able to query ship names', function() {
            var ships = battleship.allShips();
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
                var result = battleship.placeShip();
                assert.notEqual(result.indexOf('Invalid direction'), -1, result);
            });

            it('should return false for invalid ship names', function() {
                var result;

                result = battleship.placeShip('asdf', 2, 2, 'north');
                assert.notEqual(result.indexOf('Invalid ship'), -1, result);
            });

            it('should error for bad row/col', function() {
                var result;

                result = battleship.placeShip('ashd', 2, 2, 'north');
                assert.notEqual(result.indexOf('Invalid ship'), -1, result);
            });

            it('should be 1 indexed', function() {
                var result;

                result = battleship.placeShip('destroyer', 0, 2, 'north');
                assert.notEqual(result.indexOf('Invalid position'), -1, result);
            });
        });

        describe('destroyer test', function() {
            var board,
                row = 1,
                col = 2;

            beforeEach(function() {
                battleship.socket.roleId = 'test';
                battleship.placeShip('destroyer', row, col, 'north');
                // Check the spots!
                board = battleship.unwrap()._state._boards.test;
            });

            it('should place destroyer w/ correct name', function() {
                var name = board._state._ships[row-1][col-1];  // correcting for 1 indexing
                assert.equal(name, 'destroyer');
            });

            it('should place destroyer w/ correct length', function() {
                var occupied = board._state._ships
                    .reduce((count, row) => count + row.reduce((c, i) => c + !!i, 0), 0);

                assert.equal(occupied, 3);
            });

            it('should fail if overlapping boats', function() {
                var result;

                result = battleship.placeShip('battleship', row+1, col, 'north');
                assert.notEqual(result.indexOf('colliding with another'), -1);
            });

            it('should move boat if placing same boat twice', function() {
                var oldPosition;

                battleship.placeShip('destroyer', row, col+1, 'west');
                oldPosition = board._state._ships[row-1][col-1];  // correcting for 1 indexing
                assert.notEqual(oldPosition, 'destroyer');
            });
        });

    });
});

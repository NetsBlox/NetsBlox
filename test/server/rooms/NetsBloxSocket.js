var ROOT_DIR = '../../../',
    NBSocket = require(ROOT_DIR + 'src/server/rooms/NetsBloxSocket'),
    Logger = require(ROOT_DIR + 'src/server/logger'),
    assert = require('assert'),
    logger = new Logger('NetsBloxSocket');

describe('NetsBloxSocket', function() {
    describe('getNewName', function() {
        var socket;

        before(function() {
            socket = new NBSocket(logger, {on: () => {}});
        });

        it('should generate new project names', function() {
            var name = socket.getNewName();
            assert(name);
        });

        it('should generate not collide w/ existing names', function() {
            var names = ['myRoom', 'TicTacToe', 'Example2'],
                name;

            socket.user = {};
            socket.user.rooms = names.map(n => {
                return {name: n}
            });
            name = socket.getNewName();
            assert.equal(names.indexOf(name), -1);
        });
    });
});

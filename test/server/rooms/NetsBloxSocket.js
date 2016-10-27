var ROOT_DIR = '../../../',
    NBSocket = require(ROOT_DIR + 'src/server/rooms/NetsBloxSocket'),
    Logger = require(ROOT_DIR + 'src/server/logger'),
    Constants = require(ROOT_DIR + 'src/common/Constants'),
    assert = require('assert'),
    logger = new Logger('NetsBloxSocket');

describe('NetsBloxSocket', function() {
    var socket;

    describe('getNewName', function() {

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

    describe('send', function() {
        var msg,
            rawSocket;

        before(function() {
            msg = {
                type: 'uuid', 
                dstId: 'fred'
            };
            rawSocket = {
                on: () => {},
                send: () => {},
                readyState: NBSocket.prototype.OPEN
            };
            socket = new NBSocket(logger, rawSocket);
        });

        it('should default "type" to "message"', function() {
            rawSocket.send = msg => {
                msg = JSON.parse(msg);
                assert.equal(msg.type, 'message');
            };
            delete msg.type;
            socket.send(msg);
        });

        it('should default "dstId" to "everyone" (if type is "message")', function() {
            rawSocket.send = msg => {
                msg = JSON.parse(msg);
                assert.equal(msg.dstId, Constants.EVERYONE);
            };
            msg.type = 'message';
            delete msg.dstId;
            socket.send(msg);
        });

        it('should not default "dstId" to "everyone" (if type is not "message")', function() {
            rawSocket.send = msg => {
                msg = JSON.parse(msg);
                assert.notEqual(msg.dstId, Constants.EVERYONE);
            };
            msg.type = 'not-message';
            msg.dstId = 'fred';
            socket.send(msg);
        });
    });
});

describe('netsblox-socket', function() {
    var ROOT_DIR = '../../../',
        NBSocket = require(ROOT_DIR + 'src/server/rooms/netsblox-socket'),
        Logger = require(ROOT_DIR + 'src/server/logger'),
        Constants = require(ROOT_DIR + 'src/common/constants'),
        assert = require('assert'),
        logger = new Logger('netsblox-socket'),
        socket;

    describe('getNewName', function() {

        before(function() {
            socket = new NBSocket(logger, {on: () => {}});
        });

        it('should generate new project names', function() {
            var name = socket.getNewName();
            assert(name);
        });
    });

    describe('getRoom', function() {
        before(function() {
            socket = new NBSocket(logger, {on: () => {}});
        });

        it('should resolve when the room is set', function(done) {
            var testRoom = {},
                waited = false;

            socket.getRoom()
                .then(room => {
                    assert.equal(room, testRoom);
                    assert(waited);
                })
                .nodeify(done);

            setTimeout(() => {
                waited = true;
                socket._setRoom(testRoom);
            }, 25);
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

    describe('message handlers', function() {
        describe('message', function() {
            var socket;
            before(function() {
                var rawSocket = {
                    on: () => {},
                    send: () => {},
                    readyState: NBSocket.prototype.OPEN
                };
                socket = new NBSocket(logger, rawSocket);
            });

            it('should ignore bad dstId for interroom messages', function() {
                var msg = {};
                msg.dstId = 0;
                NBSocket.MessageHandlers.message.call(socket, msg);
            });
        });
    });
});

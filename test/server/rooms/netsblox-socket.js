describe('netsblox-socket', function() {
    var ROOT_DIR = '../../../',
        utils = require(ROOT_DIR + 'test/assets/utils'),
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

    describe('user messages', function() {
        var alice, bob, steve;

        before(function() {
            let room = utils.createRoom({
                name: 'add-test',
                owner: 'first',
                roles: {
                    role1: ['alice'],
                    role2: ['bob', 'steve'],
                }
            });
            [alice] = room.getSocketsAt('role1');
            [bob, steve] = room.getSocketsAt('role2');
        });

        it('should ignore bad dstId for interroom messages', function() {
            var msg = {};
            msg.dstId = 0;
            NBSocket.MessageHandlers.message.call(alice, msg);
        });

        // Test local message routing
        it('should route messages to local roles', function() {
            alice._socket.receive({
                type: 'message',
                namespace: 'netsblox',
                dstId: 'role2',
                content: {
                    msg: 'worked'
                }
            });

            const msg = bob._socket.message(-1);
            const msg2 = steve._socket.message(-1);
            assert.equal(msg.content.msg, 'worked');
            assert.equal(msg2.content.msg, 'worked');
        });
    });
});

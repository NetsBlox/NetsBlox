
describe('ActiveRoom', function() {
    var ROOT_DIR = '../../../',
        RoomManager = require(ROOT_DIR + 'src/server/rooms/RoomManager'),
        ActiveRoom = require(ROOT_DIR + 'src/server/rooms/ActiveRoom'),
        Logger = require(ROOT_DIR + 'src/server/logger'),
        Constants = require(ROOT_DIR + 'src/common/Constants'),
        assert = require('assert'),
        logger = new Logger('ActiveRoom'),
        owner = {
            username: 'test',
            _messages: [],
            send: msg => owner._messages.push(msg)
        },
        room;

    before(function() {
        RoomManager.init(new Logger('ActiveRoomTest'), {}, ActiveRoom);
    });

    describe('sendToEveryone', function() {
        var socket = {},
            msg;

        beforeEach(function() {
            room = new ActiveRoom(logger, 'sendToEveryoneTest', owner);
            room.sockets = () => [socket];
            msg = {
                type: 'message',
                msgType: 'message',
                dstId: 'test',
                content: {msg: 'test'}
            };
        });

        it('should set dstId if not set', function() {
            delete msg.dstId;
            socket.send = msg => {
                assert.equal(Constants.EVERYONE, msg.dstId);
            };
            room.sendToEveryone(msg);
        });

        it('should not set dstId if set', function() {
            var initialDst = msg.dstId;
            socket.send = msg => {
                assert.equal(initialDst, msg.dstId);
            };
            room.sendToEveryone(msg);
        });

        it('should call "send" on sockets w/ the msg', function(done) {
            socket.send = m => {
                assert.equal(m, msg);
                done();
            };
            room.sendToEveryone(msg);
        });
    });

    describe('move', function() {
        before(function() {
            room = new ActiveRoom(logger, 'moveTest', owner);
            room.add(owner, 'myRole');
            room.silentCreateRole('otherRole');
            room.move({
                src: 'myRole',
                socket: owner,
                dst: 'otherRole'
            });
        });

        it('should move the socket to the target role', function() {
            assert(room.roles['otherRole']);
        });

        it('should move the socket out of the src role', function() {
            assert(!room.roles['myRole']);
        });
    });
});

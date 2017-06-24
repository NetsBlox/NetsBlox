describe('active-room', function() {
    var ROOT_DIR = '../../../',
        _ = require('lodash'),
        RoomManager = require(ROOT_DIR + 'src/server/rooms/room-manager'),
        ActiveRoom = require(ROOT_DIR + 'src/server/rooms/active-room'),
        Constants = require(ROOT_DIR + 'src/common/constants'),
        assert = require('assert'),
        Logger = require(ROOT_DIR + 'src/server/logger'),
        logger = new Logger('active-room'),
        utils = require(ROOT_DIR + 'test/assets/utils'),
        owner = {
            username: 'test',
            _messages: [],
            send: msg => owner._messages.push(msg)
        },
        room;

    before(function() {
        RoomManager.init(new Logger('active-room-test'), {}, ActiveRoom);
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

    // Things to test:
    //   - add
    //   - getUnoccupiedRole
    it('should return the unoccupied role', function() {
        let room = utils.createRoom({
            name: 'test-room',
            owner: 'brian',
            roles: {
                p1: ['brian', 'cassie'],
                p2: ['todd', null],
                third: null
            }
        });

        let name = room.getUnoccupiedRole();
        assert.equal(name, 'third');
    });

    describe('close', function() {
        it('should send "project-closed" message to all sockets', function() {
            let room = utils.createRoom({
                name: 'test-room',
                owner: 'brian',
                roles: {
                    p1: ['brian', 'cassie'],
                    p2: ['todd', null],
                    third: null
                }
            });

            const sockets = room.sockets();
            room.close();

            sockets.map(s => s._socket)
                .forEach(socket => {
                    const msg = socket.message(-1);
                    assert.equal(msg.type, 'project-closed');
                });
        });

        it('should invoke "destroy"', function(done) {
            room = new ActiveRoom(logger, 'closeTest', owner);
            room.destroy = done;
            room.close();
        });
    });

    describe('add', function() {
        var s1, s2;

        before(function() {
            let room = utils.createRoom({
                name: 'add-test',
                owner: 'first',
                roles: {
                    role1: [],
                    role2: [],
                }
            });
            s1 = utils.createSocket('role1');
            room.add(s1, 'role1');
            s2 = utils.createSocket('role2');
            room.add(s2, 'role2');
        });

        it('should update the roleId', function() {
            assert.equal(s1.roleId, 'role1');
            assert.equal('role2', s2.roleId);
        });

        it('should send update messages to each socket', function() {
            assert.equal(s1._socket.messages().length, 2);
            assert.equal(s2._socket.messages().length, 1);
        });

        it('should send same updated room to each socket', function() {
            assert(_.isEqual(s1._socket.message(-1), s2._socket.message(-1)));
        });

        it('should send updated room', function() {
            var expected = {
                role1: [s1.username],
                role2: [s2.username]
            };
            const actual = s1._socket.message(-1).occupants;
            assert(_.isEqual(actual, expected));
        });
    });
});

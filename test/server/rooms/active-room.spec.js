describe('active-room', function() {
    var ROOT_DIR = '../../../',
        _ = require('lodash'),
        RoomManager = require(ROOT_DIR + 'src/server/rooms/room-manager'),
        ActiveRoom = require(ROOT_DIR + 'src/server/rooms/active-room'),
        Logger = require(ROOT_DIR + 'src/server/logger'),
        Constants = require(ROOT_DIR + 'src/common/constants'),
        assert = require('assert'),
        logger = new Logger('active-room'),
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

    describe('close', function() {
        it('should send "project-closed" message to all sockets', function() {
            var count = 0,
                sockets = [
                    {}, {}, {}
                ];

            sockets.forEach(s => s.send = msg => {
                if (msg.type === 'project-closed') {
                    count++;
                }
            });

            room = new ActiveRoom(logger, 'closeTest', owner);
            sockets.forEach((s, i) => room.add(s, 'role ' + i));
            room.close();
            assert.equal(count, sockets.length);
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
            s1 = new Socket('first');
            s2 = new Socket('second');

            room = new ActiveRoom(logger, 'addTest', s1);
            room.add(s1, 'role1');
            room.add(s2, 'role2');
        });

        it('should add the sockets to the "roles" dict', function() {
            assert.equal(room.roles.role1, s1);
            assert.equal(room.roles.role2, s2);
        });

        it('should update the roleId', function() {
            assert.equal(s1.roleId, 'role1');
            assert.equal('role2', s2.roleId);
        });

        it('should send update messages to each socket', function() {
            assert.equal(s1.messages().length, 2);
            assert.equal(s2.messages().length, 1);
        });

        it('should send same updated room to each socket', function() {
            assert(_.isEqual(s1.message(-1), s2.message(-1)));
        });

        it('should send updated room', function() {
            var expected = {
                role1: s1.username,
                role2: s2.username
            };
            assert(_.isEqual(s1.message(-1).occupants, expected));
        });
    });
});

var Socket = function(name) {
    this.username = name;
    this._msgs = [];
};

Socket.prototype.send = function(msg) {
    this._msgs.push(msg);
};

Socket.prototype.message = function(index) {
    if (index > -1) {
        return this._msgs[index];
    } else {
        return this._msgs[this._msgs.length+index];
    }
};

Socket.prototype.messages = function() {
    return this._msgs.slice();
};

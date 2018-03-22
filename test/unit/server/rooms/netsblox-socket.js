describe('netsblox-socket', function() {
    var ROOT_DIR = '../../../../',
        utils = require(ROOT_DIR + 'test/assets/utils'),
        sUtils = utils.reqSrc('server-utils'),
        NBSocket = utils.reqSrc('rooms/netsblox-socket'),
        Logger = utils.reqSrc('logger'),
        Constants = require(ROOT_DIR + 'src/common/constants'),
        assert = require('assert'),
        logger = new Logger('netsblox-socket'),
        MockWebSocket = require(ROOT_DIR + 'test/assets/mock-websocket'),
        socket;

    describe('getNewName', function() {

        before(function() {
            socket = new NBSocket(logger, new MockWebSocket());
        });

        it('should generate new project names', function() {
            var name = socket.getNewName();
            assert(name);
        });
    });

    describe('getRoom', function() {
        before(function() {
            socket = new NBSocket(logger, new MockWebSocket());
        });

        it('should resolve when the room is set', function(done) {
            var testRoom = {owner: 'abc'},
                waited = false;

            testRoom.getSocketsAt = () => [];
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
            rawSocket = new MockWebSocket();
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

        before(function(done) {
            utils.createRoom({
                name: 'add-test',
                owner: 'first',
                roles: {
                    role1: ['alice'],
                    role2: ['bob', 'steve'],
                }
            }).then(room => {
                [alice] = room.getSocketsAt('role1');
                [bob, steve] = room.getSocketsAt('role2');
                done();
            });
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

    describe('getProjectJson', function() {
        it('should fail if receiving mismatching project name', function(done) {
            const socket = utils.createSocket('test-user');
            socket.role = 'role1';
            socket._socket.addResponse('project-request', function(msg) {
                return {
                    type: 'project-response',
                    id: msg.id,
                    project: sUtils.getEmptyRole('myRole')
                };
            });
            socket.getProjectJson()
                .then(() => done('failed!'))
                .catch(() => done());
        });

        it('should fail if socket changed roles', function(done) {
            const socket = utils.createSocket('test-user');
            socket.role = 'role1';
            socket._socket.addResponse('project-request', function(msg) {
                return {
                    type: 'project-response',
                    id: msg.id,
                    project: sUtils.getEmptyRole('myRole')
                };
            });
            socket.getProjectJson()
                .then(() => done('failed!'))
                .catch(() => done());

            socket.role = 'role2';
        });
    });

    describe('broken connections', function() {
        before(() => NBSocket.setHeartBeatInterval(25));
        after(() => NBSocket.resetHeartBeatInterval());

        it('should detect and close broken connections', function(done) {
            // Create a socket
            let ws = new MockWebSocket();
            let socket = new NBSocket(logger, ws);

            // Verify that 'onclose' is called
            socket.onclose.push(done);

            // Disable 'pong' response
            ws.ping = () => {};
        });
    });

    describe('version checking', function() {
        it('should send server version on connect', function() {
            let ws = new MockWebSocket();
            let socket = new NBSocket(logger, ws);
            let msg = socket._socket.message(-1);
            assert.equal(msg.type, 'report-version');
        });
    });

});

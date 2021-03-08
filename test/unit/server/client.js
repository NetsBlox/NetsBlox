const ROOT_DIR = '../../../';
const utils = require(ROOT_DIR + 'test/assets/utils');
describe(utils.suiteName(__filename), function() {
    let sUtils = utils.reqSrc('server-utils'),
        Client = utils.reqSrc('client'),
        Logger = utils.reqSrc('logger'),
        Constants = utils.reqSrc('../common/constants'),
        assert = require('assert'),
        logger = new Logger('client'),
        MockWebSocket = require(ROOT_DIR + 'test/assets/mock-websocket'),
        socket;

    const NetworkTopology = utils.reqSrc('network-topology');

    describe('checkAlive', function() {
        const originalHeartbeat = Client.HEARTBEAT_INTERVAL;
        before(() => Client.HEARTBEAT_INTERVAL = 5);
        after(() => Client.HEARTBEAT_INTERVAL = originalHeartbeat);

        it('should check reconnected sockets', function(done) {
            const client = new Client(logger, new MockWebSocket());
            // close the client
            client.lastSocketActivity = 0;

            // reconnect
            client.checkAlive();
            client.reconnect(new MockWebSocket());
            client.checkAlive = () => {
                delete client.checkAlive;
                done();
            };
        });
    });

    describe('getNewName', function() {

        before(function() {
            socket = new Client(logger, new MockWebSocket());
        });

        it('should generate new project names', function() {
            var name = socket.getNewName();
            assert(name);
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
            socket = new Client(logger, rawSocket);
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

        before(async function() {
            await utils.reset();
            const project = await utils.createRoom({
                name: 'add-test',
                owner: 'first',
                roles: {
                    role1: ['alice'],
                    role2: ['bob', 'steve'],
                }
            });

            const projectId = project.getId();
            const [id1, id2] = await project.getRoleIdsFor(['role1', 'role2']);
            [alice] = NetworkTopology.getClientsAt(projectId, id1);
            [bob, steve] = NetworkTopology.getClientsAt(projectId, id2);
        });

        it('should ignore bad dstId for interroom messages', function() {
            var msg = {};
            msg.dstId = 0;
            Client.MessageHandlers.message.call(alice, msg);
        });

        // Test local message routing
        it('should route messages to local roles', async function() {
            await alice._socket.receive({
                type: 'message',
                dstId: 'role2',
                content: {
                    msg: 'worked'
                }
            });

            const msg = bob._socket.messages()
                .filter(msg => msg.type === 'message')
                .pop();
            const msg2 = steve._socket.messages()
                .filter(msg => msg.type === 'message')
                .pop();

            assert.equal(msg.content.msg, 'worked');
            assert.equal(msg2.content.msg, 'worked');
        });
    });

    describe('getProjectJson', function() {

        it('should fail if receiving mismatching project ID', function(done) {
            const socket = utils.createSocket('test-user');
            socket.roleId = 'role1';
            socket._socket.addResponse('project-request', function(msg) {
                socket.projectId = 'newId';
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
            socket.roleId = 'role1';
            socket._socket.addResponse('project-request', function(msg) {
                socket.roleId += '2';
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
    });

    describe('broken connections', function() {
        before(() => Client.setHeartBeatInterval(25));
        after(() => Client.resetHeartBeatInterval());

        it('should detect and close broken connections', function(done) {
            // Create a socket
            const ws = new MockWebSocket();
            const client = new Client(logger, ws);

            client.onClose = done;
            client.lastSocketActivity = 0;
            client.checkAlive();
        });
    });

    describe('version checking', function() {
        it('should send server version on connect', function() {
            let ws = new MockWebSocket();
            let socket = new Client(logger, ws);
            let msg = socket._socket.message(-1);
            assert.equal(msg.type, 'report-version');
        });
    });

    describe('ws', function() {
        let bob, steve;
        before(async function() {
            await utils.reset();
            const project = await utils.createRoom({
                name: 'ws-tests',
                owner: 'alice',
                roles: {
                    role1: ['alice'],
                    role2: ['bob', 'steve'],
                    role3: [],
                    role4: ['eve'],
                }
            });
            const [/*id1*/, id2] = await project.getRoleIdsFor(['role1', 'role2']);
            const projectId = project.getId();
            [bob, steve] = NetworkTopology.getClientsAt(projectId, id2);
        });

        describe('user-action', function() {
            const UserActions = utils.reqSrc('storage/user-actions');
            before(async function() {
                await bob._socket.receive({
                    type: 'user-action',
                    action: {
                        id: 1,
                        type: 'moveBlock',
                        args: []
                    }
                });

                await steve._socket.receive({
                    type: 'user-action',
                    action: {
                        id: 2,
                        type: 'openProject',
                        args: []
                    }
                });
            });

            it('should record action', async function() {
                const actions = await UserActions.session(steve.uuid);
                assert.equal(actions.length, 1);
                assert.equal(actions[0].type, 'openProject');
            });

            it('should broadcast non-"openProject" actions to collabs', function() {
                const actions = steve._socket.messages()
                    .filter(msg => msg.type === 'user-action')
                    .filter(msg => msg.action.type === 'openProject');

                assert.equal(actions.length, 0, 'Collaborator received openProject action');
            });

            it('should not broadcast "openProject" to collabs', function() {
                const actions = bob._socket.messages()
                    .filter(msg => msg.type === 'user-action')
                    .filter(msg => msg.action.type === 'openProject');
                assert.equal(actions.length, 0, 'Collaborator received openProject action');
            });
        });
    });

});

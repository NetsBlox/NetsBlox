describe('collaboration', function() {
    const utils = require('../assets/utils');
    const assert = require('assert');
    const NetworkTopology = utils.reqSrc('network-topology');
    const Q = require('q');
    const _ = require('lodash');
    const twentyActions = _.range(20).map(i => {
        return {
            type: 'user-action',
            action: {id: i}
        };
    });

    describe('basic', function() {
        let p1, p2;
        beforeEach(() => {
            return utils.reset()
                .then(() => utils.createRoom({
                    name: 'test-room',
                    owner: 'brian',
                    roles: {
                        role: ['brian', 'cassie'],
                        role2: []
                    }
                }))
                .then(project => {
                    return project.getRoleId('role')
                        .then(roleId => {
                            [p1, p2] = NetworkTopology.getSocketsAt(project.getId(), roleId);
                        });
                });
        });

        it('should block conflicting actions', async function() {
            await p1._socket.receive({type: 'user-action', action:{id: 2}})
            await p1._socket.receive({type: 'user-action', action:{id: 1}})
            let actions = p1._socket.messages().filter(msg => msg.type === 'user-action');
            assert.equal(actions.length, 1);
        });

        it('should send actions to all users', async function() {
            await p1._socket.receive({type: 'user-action', action:{id: 2}});
            await p1._socket.receive({type: 'user-action', action:{id: 3}});
            let actions = p1._socket.messages().filter(msg => msg.type === 'user-action');
            assert.equal(actions.length, 2);

            actions = p2._socket.messages().filter(msg => msg.type === 'user-action');
            assert.equal(actions.length, 2);
        });
    });

    describe('requesting actions', function() {
        let user = null;
        let project = null;
        beforeEach(async () => {
            await utils.reset();
            project = await utils.createRoom({
                name: 'test-room',
                owner: 'brian',
                roles: {
                    role: ['brian'],
                    role2: []
                }
            });
            const roleId = await project.getRoleId('role');
            [user] = NetworkTopology.getSocketsAt(project.getId(), roleId);
            await twentyActions.reduce((a, b) => a.then(() => user._socket.receive(b)), Q());
        });

        it('should be able to request missing actions', function(done) {
            const TIMEOUT = Date.now() + 2000;
            let messageCount = user._socket.messages().length;
            user._socket.receive({type: 'request-actions', actionId: 9})
                .then(() => {
                    let checkMsgs = function() {
                        let msgs = user._socket.messages().slice(messageCount)
                            .filter(msg => msg.type === 'user-action');

                        if (msgs.length === 10) {
                            done();
                        } else if (Date.now() < TIMEOUT) {
                            setTimeout(checkMsgs, 50);
                        }
                    };
                    checkMsgs();
                });
        });

        it('should send request-actions-complete', function(done) {
            let messageCount = user._socket.messages().length;
            user._socket.receive({type: 'request-actions', actionId: 9})
                .then(() => {
                    let msgs = user._socket.messages().slice(messageCount);
                    let completeMsg = msgs.find(msg => msg.type === 'request-actions-complete');
                    assert(completeMsg);
                })
                .nodeify(done);
        });

        it('should not return actions from old roles', async function() {
            let messageCount = user._socket.messages().length;
            const roleId = await project.getRoleId('role2');
            user.roleId = roleId;
            await user._socket.receive({type: 'request-actions', actionId: 9});

            const deferred = Q.defer();
            let checkMsgs = function() {
                let msgs = user._socket.messages().slice(messageCount)
                    .filter(msg => msg.type === 'user-action');

                assert.equal(msgs.length, 0);
                deferred.resolve();
            };
            setTimeout(checkMsgs, 100);

            await deferred.promise;
        });

        it('should not return actions from unsaved roles', async function() {
            const firstRoleId = user.roleId
            const roleId = await project.getRoleId('role2');
            // Remove the client from the given role
            await NetworkTopology.setClientState(user.uuid, user.projectId, roleId, user.username);

            // Add the client back to the given role
            await NetworkTopology.setClientState(user.uuid, user.projectId, firstRoleId, user.username);
            let messageCount = user._socket.messages().length;
            await user._socket.receive({type: 'request-actions', actionId: 9});
            const msgs = user._socket.messages().slice(messageCount)
                .filter(msg => msg.type === 'user-action');

            assert.equal(msgs.length, 0, 'Should be empty: ' + JSON.stringify(msgs));
        });
    });
});

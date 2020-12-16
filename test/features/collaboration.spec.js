describe('collaboration', function() {
    const utils = require('../assets/utils');
    const assert = require('assert');
    const NetworkTopology = utils.reqSrc('network-topology');
    const Q = require('q');
    const _ = require('lodash');
    let projectId, roleId;

    describe('basic', function() {
        let p1, p2;
        beforeEach(async () => {
            await utils.reset();
            const project = await utils.createRoom({
                name: 'test-room',
                owner: 'brian',
                roles: {
                    role: ['brian', 'cassie'],
                    role2: []
                }
            });
            projectId = project.getId();
            roleId = await project.getRoleId('role');
            [p1, p2] = NetworkTopology.getSocketsAt(project.getId(), roleId);
        });

        it('should block conflicting actions', async function() {
            await p1._socket.receive(userAction(projectId, roleId, 2));
            await p1._socket.receive(userAction(projectId, roleId, 1));
            let actions = p1._socket.messages().filter(msg => msg.type === 'user-action');
            assert.equal(actions.length, 1);
        });

        it('should send actions to all users', async function() {
            await p1._socket.receive(userAction(projectId, roleId, 2));
            await p1._socket.receive(userAction(projectId, roleId, 3));
            let actions = p1._socket.messages().filter(msg => msg.type === 'user-action');
            assert.equal(actions.length, 2);

            actions = p2._socket.messages().filter(msg => msg.type === 'user-action');
            assert.equal(actions.length, 2);
        });
    });

    describe('requesting actions', function() {
        let user = null;
        let project = null;
        let roleId;
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
            projectId = project.getId();
            roleId = await project.getRoleId('role');
            [user] = NetworkTopology.getSocketsAt(project.getId(), roleId);
            const twentyActions = _.range(20)
                .map(i => userAction(projectId, roleId, i));

            await twentyActions.reduce(
                (a, b) => a.then(() => user._socket.receive(b)),
                Promise.resolve()
            );
        });

        it('should be able to request missing actions', async function() {
            const TIMEOUT = Date.now() + 2000;
            const messageCount = user._socket.messages().length;
            const actionRequest = {
                type: 'request-actions',
                projectId,
                roleId,
                actionId: 9
            };
            await user._socket.receive(actionRequest);
            let msgs = user._socket.messages().slice(messageCount)
                .filter(msg => msg.type === 'user-action');

            while (msgs.length < 10 && Date.now() < TIMEOUT) {
                msgs = user._socket.messages().slice(messageCount)
                    .filter(msg => msg.type === 'user-action');

                await sleep(50);
            }
        });

        it('should send request-actions-complete', async function() {
            let messageCount = user._socket.messages().length;
            await user._socket.receive({type: 'request-actions', actionId: 9});
            let msgs = user._socket.messages().slice(messageCount);
            let completeMsg = msgs.find(msg => msg.type === 'request-actions-complete');
            assert(completeMsg);
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
            const firstRoleId = user.roleId;
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

    async function sleep(time) {
        return new Promise(resolve => setTimeout(resolve, time));
    }

    function userAction(projectId, roleId, id=1) {
        return {
            type: 'user-action',
            projectId,
            roleId,
            action:{id}
        };
    }
});

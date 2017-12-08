describe('collaboration', function() {
    const utils = require('../assets/utils');
    const RoomManager = utils.reqSrc('rooms/room-manager');
    const Logger = utils.reqSrc('logger');
    const ActiveRoom = utils.reqSrc('rooms/active-room');
    const assert = require('assert');
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
        beforeEach(done => {
            RoomManager.init(new Logger('active-room-test'), {}, ActiveRoom);
            utils.reset()
                .then(() => utils.createRoom({
                    name: 'test-room',
                    owner: 'brian',
                    roles: {
                        role: ['brian', 'cassie'],
                        role2: []
                    }
                }))
                .then(room => [p1, p2] = room.getSocketsAt('role'))
                .nodeify(done);
        });

        it('should block conflicting actions', function(done) {
            p1._socket.receive({type: 'user-action', action:{id: 2}})
                .then(() => p1._socket.receive({type: 'user-action', action:{id: 1}}))
                .then(() => {
                    let actions = p1._socket.messages().filter(msg => msg.type === 'user-action');
                    assert.equal(actions.length, 1);
                })
                .nodeify(done);
        });

        it('should send actions to all users', function(done) {
            p1._socket.receive({type: 'user-action', action:{id: 2}})
                .then(() => p1._socket.receive({type: 'user-action', action:{id: 3}}))
                .then(() => {
                    let actions = p1._socket.messages().filter(msg => msg.type === 'user-action');
                    assert.equal(actions.length, 2);

                    actions = p2._socket.messages().filter(msg => msg.type === 'user-action');
                    assert.equal(actions.length, 2);
                })
                .nodeify(done);
        });
    });

    describe('requesting actions', function() {
        let user = null;
        let room = null;
        beforeEach(done => {
            RoomManager.init(new Logger('active-room-test'), {}, ActiveRoom);
            utils.reset()
                .then(() => utils.createRoom({
                    name: 'test-room',
                    owner: 'brian',
                    roles: {
                        role: ['brian'],
                        role2: []
                    }
                }))
                .then(_room => {
                    room = _room;
                    [user] = _room.getSocketsAt('role');
                })
                .then(() => twentyActions.reduce((a, b) => a.then(() => user._socket.receive(b)), Q()))
                .nodeify(done);
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

        it('should not return actions from old roles', function(done) {
            let messageCount = user._socket.messages().length;
            user.role = 'role2';
            user._socket.receive({type: 'request-actions', actionId: 9})
                .then(() => {
                    let checkMsgs = function() {
                        let msgs = user._socket.messages().slice(messageCount)
                            .filter(msg => msg.type === 'user-action');

                        assert.equal(msgs.length, 0);
                        done();
                    };
                    setTimeout(checkMsgs, 100);
                });
        });

        it('should not return actions from unsaved roles', function(done) {
            let role = user.role;
            let messageCount = 0;
            room.silentRemove(user)  // this should clear the project-actions for the role
                .then(() => room.silentAdd(user, role))
                .then(() => {  // move back to role and request actions
                    messageCount = user._socket.messages().length;
                    return user._socket.receive({type: 'request-actions', actionId: 9});
                })
                .then(() => {
                    let msgs = user._socket.messages().slice(messageCount)
                        .filter(msg => msg.type === 'user-action');

                    assert.equal(msgs.length, 0, 'Should be empty: ' + JSON.stringify(msgs));
                })
                .nodeify(done);
        });
    });
});

describe('collaboration', function() {
    const utils = require('../assets/utils');
    const RoomManager = utils.reqSrc('rooms/room-manager');
    const Logger = utils.reqSrc('logger');
    const ActiveRoom = utils.reqSrc('rooms/active-room');
    const assert = require('assert');
    const Q = require('q');
    const _ = require('lodash');
    let p1, p2;

    beforeEach(done => {
        RoomManager.init(new Logger('active-room-test'), {}, ActiveRoom);
        utils.reset()
            .then(() => utils.createRoom({
                name: 'test-room',
                owner: 'brian',
                roles: {
                    role: ['brian', 'cassie']
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

    it('should be able to request missing actions', function(done) {
        let actions = _.range(20).map(i => {
            return {
                type: 'user-action',
                action: {id: i}
            };
        });

        let requests = actions.reduce((a, b) => a.then(p1._socket.receive(b)), Q());
        let messageCount = 0;
        const TIMEOUT = Date.now() + 2000;
        requests.then(() => {
                messageCount = p2._socket.messages().length;
                return p2._socket.receive({type: 'request-actions', actionId: 9});
            })
            .then(() => {
                let checkMsgs = function() {
                    let msgs = p2._socket.messages().slice(messageCount)
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
});

describe('cloud-variables', function() {
    const Q = require('q');
    const utils = require('../../../../assets/utils');
    const CloudVariables = utils.reqSrc('rpc/procedures/cloud-variables/cloud-variables');
    const RPCMock = require('../../../../assets/mock-rpc');
    const cloudvariables = new RPCMock(CloudVariables);
    const assert = require('assert');

    utils.verifyRPCInterfaces(cloudvariables, [
        ['getVariable', ['name', 'password']],
        ['setVariable', ['name', 'value', 'password']],
        ['deleteVariable', ['name', 'password']],
        ['getUserVariable', ['name']],
        ['setUserVariable', ['name', 'value']],
        ['deleteUserVariable', ['name']],
    ]);

    let counter = 0;
    function newVar() {
        return `var${counter++}`;
    }

    before(() => utils.reset());

    describe('public', function() {

        it('should not set variables w/ invalid names', function() {
            try {
                cloudvariables.setVariable('^#', 'world');
            } catch(err) {
                assert(err.message.includes('variable name'));
            }
        });

        it('should get/set variables', function() {
            const name = newVar();
            return cloudvariables.setVariable(name, 'world')
                .then(() => cloudvariables.getVariable(name))
                .then(result => assert.equal(result, 'world'));
        });

        it('should delete variables', function() {
            const name = newVar();
            return cloudvariables.setVariable(name, 'world')
                .then(() => cloudvariables.deleteVariable(name))
                .then(() => cloudvariables.getVariable(name))
                .catch(err => assert(err.message.includes('not found')));
        });

        it('should not get/set variables w/ bad password', function() {
            const name = newVar();
            return cloudvariables.setVariable(name, 'world', 'password')
                .then(() => cloudvariables.getVariable(name))
                .catch(err => assert(err.message.includes('password')));
        });

        it('should not set variables w/ bad password', function() {
            const name = newVar();
            return cloudvariables.setVariable(name, 'world', 'password')
                .then(() => cloudvariables.setVariable(name, 'asdf'))
                .catch(err => assert(err.message.includes('password')));
        });

        it('should not delete variables w/ bad password', function() {
            const name = newVar();
            return cloudvariables.setVariable(name, 'world', 'password')
                .then(() => cloudvariables.deleteVariable(name))
                .catch(err => assert(err.message.includes('password')));
        });

        describe('locking variables', function() {
            const name = 'lock-var-test';
            const initialValue = 'world';
            const client1 = '_netsblox_1';
            const client2 = '_netsblox_2';

            beforeEach(() => {
                cloudvariables._rpc._setMaxLockAge(5 * 1000 * 60);
                cloudvariables.setRequester(client1);
                return utils.reset()
                    .then(() => cloudvariables.setVariable(name, initialValue))
                    .then(() => cloudvariables.lockVariable(name));
            });

            it('should return error if variable doesnt exist', function(done) {
                cloudvariables.lockVariable('i-dont-exist')
                    .catch(err => {
                        assert(err.message.includes('not found'));
                        done();
                    });
            });

            it('should allow locker to read locked variable', function() {
                return cloudvariables.getVariable(name)
                    .then(value => assert.equal(value, initialValue));
            });

            it('should allow other user to read locked variable', function() {
                cloudvariables.socket.uuid = client2;
                return cloudvariables.getVariable(name)
                    .then(value => assert.equal(value, initialValue));
            });

            it('should allow original user to set locked variable', function() {
                return cloudvariables.setVariable(name, 'newValue');
            });

            it('should NOT allow other user to set locked variable', function() {
                cloudvariables.socket.uuid = client2;
                return cloudvariables.setVariable(name, 'newValue')
                    .catch(err => assert(err.message.includes('locked')));
            });

            it('should throw error on unlock of unlocked variable', function(done) {
                const newVar = 'unlocked-var';

                cloudvariables.setVariable(newVar, '10')
                    .then(() => cloudvariables.unlockVariable(newVar))
                    .then(() => done('no error thrown'))
                    .catch(err => {
                        assert.equal(err.message, 'Variable not locked');
                        done();
                    });
            });

            it('should block on subsequent locks', function() {
                const events = [];

                cloudvariables.setRequester(client2);
                const acquireLock = cloudvariables.lockVariable(name)
                    .then(() => events.push('acquired lock'));

                cloudvariables.setRequester(client1);
                const releaseLock = cloudvariables.unlockVariable(name)
                    .then(() => events.push('release lock'));

                return Q.all([acquireLock, releaseLock])
                    .then(() => assert(events[0] === 'release lock'));
            });

            it('should no-op on subsequent locks (same client)', function() {
                const events = [];

                // acquire and release a lock simultaneously
                const acquireLock = cloudvariables.lockVariable(name)
                    .then(() => events.push('acquired lock'));

                const releaseLock = cloudvariables.unlockVariable(name)
                    .then(() => events.push('release lock'));

                return Q.all([acquireLock, releaseLock])
                    .then(() => assert(events[0] === 'acquired lock'));
            });

            it('should only be able to be unlocked by the "locker"', function(done) {
                cloudvariables.setRequester(client2);
                cloudvariables.unlockVariable(name)
                    .then(() => done('expected unlock variable to throw error'))
                    .catch(err => {
                        assert(err.message.includes('Variable is locked'));
                        done();
                    });
            });

            it('should apply next lock if lock times out', function() {
                return cloudvariables.unlockVariable(name)
                    .then(() => {
                        cloudvariables._rpc._setMaxLockAge(200);

                        return cloudvariables.lockVariable(name);
                    })
                    .then(() => {
                        cloudvariables.setRequester(client2);
                        return cloudvariables.lockVariable(name);
                    });
            });

            it('should un-queue lock if connection closed early', function(done) {
                cloudvariables.setRequester(client2);

                // Create a new lock then cancel the request
                setTimeout(() => cloudvariables.request.abort(), 100);  // this is not ideal

                cloudvariables.lockVariable(name)
                    .then(() => done('did not throw exception'))
                    .catch(err => {  // Ensure that it throws exception
                        assert(err.message.includes('anceled'));

                        const queuedLocks = cloudvariables._rpc._queuedLocks;
                        assert.deepEqual(queuedLocks, {});
                        done();
                    });
            });

            it('should reject queued locks on variable delete', function(done) {
                cloudvariables.setRequester(client2);

                // Create a new lock then delete the variable
                cloudvariables.lockVariable(name)
                    .then(() => done('did not throw exception'))
                    .catch(err => {  // Ensure that it throws exception
                        assert(err.message.includes('Variable deleted'));

                        const queuedLocks = cloudvariables._rpc._queuedLocks;
                        assert.deepEqual(queuedLocks, {});
                        done();
                    });

                cloudvariables.setRequester(client1);
                cloudvariables.deleteVariable(name);
            });
        });
    });

    describe('user', function() {
        beforeEach(function() {
            cloudvariables.setRequester('client_1', 'brian');
        });

        it('should not be able to set variables if guest', function() {
            const name = newVar();
            cloudvariables.socket.loggedIn = false;
            try {
                return cloudvariables.setUserVariable(name, 'world');
            } catch(err) {
                assert(err.message.includes('Login required'));
            }
        });

        it('should get/set variables', function() {
            const name = newVar();
            return cloudvariables.setUserVariable(name, 'world')
                .then(() => cloudvariables.getUserVariable(name))
                .then(result => assert.equal(result, 'world'));
        });

        it('should delete variables', function() {
            const name = newVar();
            return cloudvariables.setUserVariable(name, 'world')
                .then(() => cloudvariables.deleteUserVariable(name))
                .then(() => cloudvariables.getUserVariable(name))
                .catch(err => assert(err.message.includes('not found')));
        });

        it('should not set other user variables', function() {
            const name = newVar();
            return cloudvariables.setUserVariable(name, 'world')
                .then(() => {
                    cloudvariables.socket.username = 'hamid';
                    return cloudvariables.getUserVariable(name);
                })
                .catch(err => assert(err.message.includes('not found')));
        });

        it('should not delete variables w/ bad password', function() {
            const name = newVar();
            return cloudvariables.setUserVariable(name, 'world')
                .then(() => cloudvariables.deleteUserVariable(name))
                .catch(err => assert(err.message.includes('password')));
        });
    });
});

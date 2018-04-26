describe('cloud-variables', function() {
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
    });

    describe('user', function() {
        beforeEach(function() {
            cloudvariables.socket.loggedIn = true;
            cloudvariables.socket.username = 'brian';
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

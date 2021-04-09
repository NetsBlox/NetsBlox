const utils = require('../../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    const Autograders = utils.reqSrc('services/procedures/autograders/autograders');
    const RPCMock = require('../../../../../assets/mock-service');
    const service = new RPCMock(Autograders);
    const assert = require('assert');

    utils.verifyRPCInterfaces('Autograders', [
        ['getAutograders'],
        ['getAutograderConfig', ['name']],
        ['createAutograder', ['configuration']],
    ]);


    describe('getAutograders', function() {
        it('should require login', async function() {
            await assert.rejects(
                () => service.getAutograders()
            );
        });
    });

    describe('getAutograderConfig', function() {
        it('should require login', async function() {
            await assert.rejects(
                () => service.getAutograderConfig()
            );
        });
    });

    describe('createAutograder', function() {
        it('should require login', async function() {
            await assert.rejects(
                () => service.createAutograder(),
                /Login required./
            );
        });
    });
});

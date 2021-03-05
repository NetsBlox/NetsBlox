const ROOT_DIR = '../../../';
const utils = require(ROOT_DIR + 'test/assets/utils');
describe(utils.suiteName(__filename), function() {
    const Network = utils.reqSrc('network-topology');
    const assert = require('assert').strict;

    describe('checkClients', function() {
        it('should call checkAlive on connected clients', function() {
            let count = 0;
            const newClient = isWaitingForReconnect => ({
                isWaitingForReconnect,
                checkAlive: () => {
                    assert(!isWaitingForReconnect);
                    count++;
                },
            });
            const clients = [
                newClient(true),
                newClient(false),
                newClient(true),
                newClient(false),
                newClient(false),
            ];
            Network.checkClients(clients);
            assert.equal(count, 3);
        });
    });
});

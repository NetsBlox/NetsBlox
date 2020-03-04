describe('BaseX', function() {
    const utils = require('../../../../assets/utils');

    utils.verifyRPCInterfaces('BaseX', [
        ['query', ['url', 'database', 'query', 'username', 'password']],
        ['command', ['url', 'command', 'username', 'password']],
    ]);
});

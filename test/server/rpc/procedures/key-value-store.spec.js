describe('kvstore', function() {
    var KVStore = require('../../../../src/server/rpc/procedures/key-value-store/key-value-store'),
        RPCMock = require('../../../assets/mock-rpc'),
        utils = require('../../../assets/utils'),
        kvstore = new RPCMock(KVStore);

    utils.verifyRPCInterfaces(kvstore, [
        ['get', ['key']],
        ['put', ['key', 'value']],
        ['delete', ['key']],
        ['parent', ['key']],
        ['child', ['key']]
    ]);
});

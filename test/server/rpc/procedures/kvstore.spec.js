describe('kvstore', function() {
    var KVStore = require('../../../../src/server/rpc/procedures/KVStore/KVStore'),
        RPCMock = require('../../../assets/MockRPC'),
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

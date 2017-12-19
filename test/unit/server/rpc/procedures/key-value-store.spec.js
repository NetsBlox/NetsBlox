describe('kvstore', function() {
    const utils = require('../../../../assets/utils');
    var KVStore = utils.reqSrc('rpc/procedures/key-value-store/key-value-store'),
        RPCMock = require('../../../../assets/mock-rpc'),
        kvstore = new RPCMock(KVStore);

    utils.verifyRPCInterfaces(kvstore, [
        ['get', ['key']],
        ['put', ['key', 'value']],
        ['delete', ['key']],
        ['parent', ['key']],
        ['child', ['key']]
    ]);
});

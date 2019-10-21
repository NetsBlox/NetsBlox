describe('kvstore', function() {
    const utils = require('../../../../assets/utils');
    const KVStore = utils.reqSrc('rpc/procedures/key-value-store/key-value-store');
    const RPCMock = require('../../../../assets/mock-rpc');
    const kvstore = new RPCMock(KVStore);
    const assert = require('assert');

    utils.verifyRPCInterfaces('KeyValueStore', [
        ['get', ['key']],
        ['put', ['key', 'value']],
        ['delete', ['key']],
        ['parent', ['key']],
        ['child', ['key']]
    ]);

    describe('key validation', function() {
        it('should not allow . in key', function() {
            assert.throws(() => kvstore.put('mr.hyde'));
        });

        it('should not allow . in nested key', function() {
            assert.throws(() => kvstore.put('/firstDir/mr.hyde'));
        });
    });

});

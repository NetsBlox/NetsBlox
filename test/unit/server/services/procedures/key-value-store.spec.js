describe('KeyValueStore', function() {
    const utils = require('../../../../assets/utils');
    const KVStore = utils.reqSrc('services/procedures/key-value-store/key-value-store');
    const RPCMock = require('../../../../assets/mock-rpc');
    const kvstore = new RPCMock(KVStore);
    const assert = require('assert');

    async function assertThrowsAsync(fn) {
        try {
            await fn();
            assert(false, 'Exception expected.');
        } catch (err) {
        }
    }

    utils.verifyRPCInterfaces('KeyValueStore', [
        ['get', ['key', 'password']],
        ['put', ['key', 'value', 'password']],
        ['delete', ['key', 'password']],
        ['parent', ['key']],
        ['child', ['key', 'password']]
    ]);

    describe('key validation', function() {
        it('should not allow . in key', async function() {
            await assertThrowsAsync(() => kvstore.put('mr.hyde'));
        });

        it('should not allow . in nested key', async function() {
            await assertThrowsAsync(() => kvstore.put('/firstDir/mr.hyde'));
        });
    });

    describe('get', function() {
        before(async () => {
            await Promise.all([
                kvstore.put('abc', 123),
                kvstore.put('def/ghi', 234)
            ]);
        });

        it('should get top-level value', async function() {
            const result = await kvstore.get('abc');
            assert.equal(result, 123);
        });

        it('should get value using nested keys', async function() {
            const result = await kvstore.get('def/ghi');
            assert.equal(result, 234);
        });

        describe('passwords', function() {
            before(async () => {
                await kvstore.put('hi', 56, 'secret');
            });

            it('should get password-protected value', async function() {
                const result = await kvstore.get('hi', 'secret');
                assert.equal(result, 56);
            });

            it('should fail if no password', async function() {
                await assertThrowsAsync(() => kvstore.get('hi'));
            });

            it('should fail if invalid password', async function() {
                await assertThrowsAsync(() => kvstore.get('hi', 'huh?'));
            });
        });
    });

    describe('child', function() {
        const keys = [
            'child_test/1',
            'child_test/2',
            'child_test/3',
        ];
        before(async () => {
            await Promise.all(keys.map((key, index) => kvstore.put(key, index)));
        });

        it('should return child IDs', async function() {
            const childIDs = await kvstore.child('child_test');
            childIDs.forEach((actualKey, index) => {
                assert.equal(actualKey, keys[index]);
            });
        });
    });

    describe('parent', function() {
        it('should return correct parent key value', function() {
            const parentKey = kvstore.parent('a/b/c');
            assert.equal(parentKey, '/a/b');
        });

        it('should not return double leading slashes', function() {
            const parentKey = kvstore.parent('/a/b/c');
            assert.equal(parentKey, '/a/b');
        });
    });
});

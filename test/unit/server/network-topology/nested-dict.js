const ROOT_DIR = '../../../../';
const utils = require(ROOT_DIR + 'test/assets/utils');
describe.only(utils.suiteName(__filename), function() {
    const NestedDict = utils.reqSrc('network-topology/nested-dict');
    const assert = require('assert').strict;
    let dict;

    describe('get/set', function() {
        beforeEach(() => {
            dict = new NestedDict();
            dict.set('hello', 'world');
        });

        it('should retrieve value', function() {
            const value = dict.get('hello');
            assert.equal(value, 'world');
        });

        it('should return default if entry not found', function() {
            const value = dict.getOrSet('hello?', 'cat');
            assert.equal(value, 'cat');
        });

        it('should return default if (nested) entry not found', function() {
            dict.set('a', 'cat');
            const value = dict.getOrSet('a', 'b', 'c', 'cat');
            assert.equal(value, 'cat');
        });

        it('should create nested dicts as needed', function() {
            dict.set('a', 'b', 'cat');
            const value = dict.get('a');
            assert.deepEqual(value, {b: 'cat'});
        });
    });

    describe('delete', function() {
        beforeEach(() => dict = new NestedDict());

        it('should delete value', function() {
            dict.set('hello', 'world');
            dict.delete('hello');
            assert.equal(dict.get('hello'), undefined);
        });

        it('should no-op if value doesnt exist', function() {
            dict.delete('a', 'b', 'c');
        });

        it('should remove empty nested dicts', function() {
            dict.set('a', 'b', 'c', 'world');
            dict.delete('a', 'b', 'c');
            assert.equal(dict.get('a'), undefined);
        });
    });
});

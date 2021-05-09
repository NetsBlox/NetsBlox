const utils = require('../../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    const h = utils.reqSrc('services/procedures/project-gutenberg/helpers');
    const path = require('path');
    const assert = require('assert').strict;
    const wu = require('wu');

    describe('takeUntil', function() {
        it('should collect', async function() {
            const nums = numbers();
            const lessThan10 = h.takeUntil(numbers(), n => n === 10);
            assert.deepEqual(h.collect(lessThan10), [1, 2,3, 4, 5, 6, 7, 8, 9]);
        });

        it('should not exhaust iterator', async function() {
            const nums = numbers();
            const lessThan10 = await h.collect(h.takeWhile(nums, n => n < 10));
            assert.equal(nums.next().value, 10);
        });
    });

    function* numbers() {
        let i = 0;
        while (true) {
            yield ++i;
        }
    }

});

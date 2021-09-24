const utils = require('../../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    const assert = require('assert');
    const helpers = utils.reqSrc('services/procedures/alexa/helpers');

    describe('textBtwn', function() {
        it('should get text between delimiters', function() {
            const text = 'abcdefghi';
            assert.equal(helpers.textBtwn(text, 'abc', 'ghi'), 'def');
        });
    });
});

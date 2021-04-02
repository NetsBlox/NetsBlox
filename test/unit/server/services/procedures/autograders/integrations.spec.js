const utils = require('../../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    const Integrations = utils.reqSrc('services/procedures/autograders/integrations');
    const {CourseraKeyError} = Integrations.errors;
    const assert = require('assert');

    describe('get', function() {
        it('should throw error for invalid integrations', function() {
            assert.throws(() => Integrations.get('notCoursera'));
        });
    });

    describe('coursera', function() {
        it('should get integration', function() {
            const integration = Integrations.get('coursera');
            assert(integration);
        });

        it('should ensure assignments have assignment key', async function() {
            const integration = Integrations.get('coursera');
            const name = 'assignment 1';
            assert.throws(
                () => integration.validate({assignments: [{name}]}),
                CourseraKeyError
            );
        });

        it('should ensure assignments have assignment key', async function() {
            const integration = Integrations.get('coursera');
            assert.throws(
                () => integration.validate({assignments: [
                    {tests: [{}]}
                ]}),
                CourseraKeyError
            );
        });
    });
});

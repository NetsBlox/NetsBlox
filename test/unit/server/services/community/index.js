const utils = require('../../../../assets/utils');
describe(utils.suiteName(__filename), function() {
    const CommunityService = utils.reqSrc('services/community');
    const assert = require('assert').strict;

    it('should return null if unknown service type', function() {
        const service = CommunityService.new({type: 'InvalidService'});
        assert.equal(service, null);
    });
});

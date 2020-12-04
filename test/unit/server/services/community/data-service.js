describe('data-service', function() {
    const assert = require('assert').strict;
    const utils = require('../../../../assets/utils');
    const CommunityService = utils.reqSrc('services/community');
    const ServiceSpec = require('./data-service.json');
    const service = CommunityService.new(ServiceSpec, false);

    describe('docs', function() {
        ServiceSpec.methods.forEach(method => {
            const {name} = method;
            const docs = service._docs;

            it(`should be able to get doc for ${name}`, function() {
                assert(docs.getDocFor(name), `Doc not found for ${name}`);
            });

            it(`should be able to get args for ${name}`, function() {
                const doc = docs.getDocFor(name);
                assert.deepEqual(doc.args.map(arg => arg.name), method.arguments);
            });
        });
    });

    describe('usage', function() {
        it('should getAgeData for "brian" (query-transform)', async function() {
            const age = await service.getAgeData('brian');
            assert.deepEqual(age, ['28']);
        });

        it('should getAgeSumExplicit (query-transform-combine)', async function() {
            const sum = await service.getAgeSumExplicitRingArgs();
            assert.deepEqual(sum, 65);
        });

        // The following test is skipped as it is related to a known issue
        // in the snap2js compiler:
        //
        //     https://github.com/NetsBlox/Snap2Js/issues/105
        //
        it.skip('should getAgeSum (query-transform-combine)', async function() {
            const sum = await service.getAgeSum();
            assert.deepEqual(sum, 65);
        });

        it('should getAgeData for "brian" (code)', async function() {
            const age = await service.getAgeData('brian');
            assert.deepEqual(age, ['28']);
        });

        it('should getPeopleWithHeights btwn 50,59 (custom code)', async function() {
            const names = await service.getPeopleWithHeights(50, 59);
            assert.deepEqual(names, ['fred', 'hank']);
        });

        it('should getFirstRow (custom code)', async function() {
            const row = await service.getFirstRow();
            assert.deepEqual(row, ['brian', '28', '60']);
        });
    });
});

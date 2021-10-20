const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    utils.verifyRPCInterfaces('MaunaLoaCO2Data', [
        ['getRawCO2', ['startyear', 'endyear']],
        ['getCO2Trend', ['startyear', 'endyear']],
    ]);
    const assert = require('assert');
    const service = utils.reqSrc('services/procedures/mauna-loa-co2-data/mauna-loa-co2-data');

    function checkResult(res) {
        assert(Array.isArray(res));
        assert(res.length);
        for (const v of res) {
            assert(Array.isArray(v));
            assert(v.length === 2);
            assert(typeof(v[0]) === 'number');
            assert(typeof(v[1]) === 'number');
        }
    }

    describe('Data', () => {
        it('should be able to get raw data without error', async () => {
            checkResult(await service.getRawCO2());
        });
        it('should be able to get trend data without error', async () => {
            checkResult(await service.getCO2Trend());
        });
    });
});

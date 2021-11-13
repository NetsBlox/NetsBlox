const utils = require('../../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    const VaxData = utils.reqSrc('services/procedures/covid-19/vaccination/vaccination-data-source.js');
    const assert = require('assert');

    it('should get data non-empty data from the world data provider', async function() {
        const res = await VaxData.getWorldData();
        assert(res.length !== 0);
    });
});

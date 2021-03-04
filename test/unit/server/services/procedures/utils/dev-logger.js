const utils = require('../../../../../assets/utils');
const fsp = require('fs').promises;
const assert = require('assert').strict;

describe(utils.suiteName(__filename), function() {
    const nop = () => {};
    const devLogger = utils.reqSrc('services/procedures/utils/dev-logger');

    beforeEach(() => fsp.unlink(devLogger.filename).catch(nop));

    it('should be able to write logs', async function() {
        await devLogger.log('test');
        const logs = await devLogger.read();
        assert(logs.startsWith('test'));
    });

    it('should be able to clear logs', async function() {
        await devLogger.log('test');
        await devLogger.clear();
        const logs = await devLogger.read();
        assert.equal(logs, '');
    });
});

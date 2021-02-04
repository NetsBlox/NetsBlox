const ROOT_DIR = '../../../';
const utils = require(ROOT_DIR + 'test/assets/utils');

describe(utils.suiteName(__filename), function() {
    const Address = utils.reqSrc('netsblox-address');
    const {AddressNotFound} = utils.reqSrc('api/core/errors');

    before(() => utils.reset());

    it('should throw AddressNotFound on invalid public address', async function() {
        await utils.shouldThrow(() => Address.new('invalidPublicRole'), AddressNotFound);
    });
});

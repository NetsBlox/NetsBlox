const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    const RPCMock = require('../../../../assets/mock-service');
    const assert = require('assert').strict;
    let BaseX, mockService;

    before(() => {
        mockService = new RPCMock(utils.reqSrc('services/procedures/base-x/base-x'));
        BaseX = mockService.unwrap();
    });
    after(() => mockService.destroy());

    utils.verifyRPCInterfaces('BaseX', [
        ['query', ['url', 'database', 'query', 'username', 'password']],
        ['command', ['url', 'command', 'username', 'password']],
    ]);

    describe('parseResponse', function() {
        it('should convert simple xml to JSON ML', function() {
            const xml = '<a>one</a>';
            const result = BaseX._parseResponse(xml);
            assert.deepEqual(result, ['a', 'one']);
        });

        it('should parse xml 2 root elements', function() {
            const twoRoots = '<a>one</a><b>two</b>';
            const result = BaseX._parseResponse(twoRoots);
            assert.deepEqual(result, [['a', 'one'], ['b', 'two']]);
        });
    });
});

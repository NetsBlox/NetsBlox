describe('met-museum', function() {
    const utils = require('../../../../assets/utils');
    var Corgis = utils.reqSrc('rpc/procedures/corgis/corgis'),
        RPCMock = require('../../../../assets/mock-rpc'),
        corgisMock = new RPCMock(Corgis);

    utils.verifyRPCInterfaces(corgisMock, [
        ['searchDataset', ['name', 'query', 'limit']],
        ['availableDatasets', []],
    ]);
});

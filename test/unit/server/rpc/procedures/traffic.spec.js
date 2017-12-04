describe('traffic', function() {
    const utils = require('../../../../assets/utils');
    var Traffic = utils.reqSrc('rpc/procedures/traffic/traffic'),
        RPCMock = require('../../../../assets/mock-rpc'),
        traffic = new RPCMock(Traffic);

    utils.verifyRPCInterfaces(traffic, [
        ['search', ['westLongitude', 'northLatitude', 'eastLongitude', 'southLatitude']],
        ['stop']
    ]);
});

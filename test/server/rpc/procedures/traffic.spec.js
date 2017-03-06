describe.only('traffic', function() {
    var Traffic = require('../../../../src/server/rpc/procedures/traffic/traffic'),
        RPCMock = require('../../../assets/mock-rpc'),
        utils = require('../../../assets/utils'),
        traffic = new RPCMock(Traffic);

    utils.verifyRPCInterfaces(traffic, [
        ['search', ['westLongitude', 'northLatitude', 'eastLongitude', 'southLatitude']],
        ['stop']
    ]);
});

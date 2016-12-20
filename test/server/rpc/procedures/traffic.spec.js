describe('traffic', function() {
    var Traffic = require('../../../../src/server/rpc/procedures/Traffic/Traffic'),
        RPCMock = require('../../../assets/MockRPC'),
        utils = require('../../../assets/utils'),
        traffic = new RPCMock(Traffic);

    utils.verifyRPCInterfaces(traffic, [
        ['search', ['westLongitude', 'northLatitude', 'eastLongitude', 'southLatitude']],
        ['stop']
    ]);
});

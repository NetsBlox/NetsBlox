describe('waterwatch', function() {
    var Waterwatch = require('../../../../src/server/rpc/procedures/water-watch/water-watch'),
        RPCMock = require('../../../assets/mock-rpc'),
        utils = require('../../../assets/utils'),
        waterwatch = new RPCMock(Waterwatch);

    utils.verifyRPCInterfaces(waterwatch, [
        ['gageHeight', ['minLatitude', 'maxLatitude', 'minLongitude', 'maxLongitude']],
        ['streamFlow', ['minLatitude', 'maxLatitude', 'minLongitude', 'maxLongitude']],
        ['waterTemp', ['minLatitude', 'maxLatitude', 'minLongitude', 'maxLongitude']]
    ]);
});

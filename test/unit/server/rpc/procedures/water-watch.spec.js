describe('waterwatch', function() {
    const utils = require('../../../../assets/utils');
    var Waterwatch = utils.reqSrc('rpc/procedures/water-watch/water-watch'),
        RPCMock = require('../../../../assets/mock-rpc'),
        waterwatch = new RPCMock(Waterwatch);

    utils.verifyRPCInterfaces(waterwatch, [
        ['gageHeight', ['minLatitude', 'maxLatitude', 'minLongitude', 'maxLongitude']],
        ['streamFlow', ['minLatitude', 'maxLatitude', 'minLongitude', 'maxLongitude']],
        ['waterTemp', ['minLatitude', 'maxLatitude', 'minLongitude', 'maxLongitude']]
    ]);
});

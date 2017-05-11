describe('waterwatch', function() {
    var Waterwatch = require('../../../../src/server/rpc/procedures/waterwatch/waterwatch'),
        RPCMock = require('../../../assets/mock-rpc'),
        utils = require('../../../assets/utils'),
        waterwatch = new RPCMock(Waterwatch);

    utils.verifyRPCInterfaces(waterwatch, [
        ['gageHeight', ['northernLat', 'easternLong', 'southernLat', 'westernLong']],
        ['streamFlow', ['northernLat', 'easternLong', 'southernLat', 'westernLong']],
        ['waterTemp', ['northernLat', 'easternLong', 'southernLat', 'westernLong']]
    ]);
});

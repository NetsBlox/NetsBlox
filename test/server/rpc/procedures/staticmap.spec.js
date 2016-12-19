describe.only('staticmap', function() {
    var StaticMap = require('../../../../src/server/rpc/procedures/StaticMap/StaticMap'),
        RPCMock = require('../../../assets/MockRPC'),
        utils = require('../../../assets/utils'),
        staticmap = new RPCMock(StaticMap);

    utils.verifyRPCInterfaces(staticmap, [
        ['getMap', ['latitude', 'longitude', 'width', 'height', 'zoom']],
        ['getLongitude', ['x']],
        ['getLatitude', ['y']],
        ['getXFromLongitude', ['longitude']],
        ['getYFromLatitude', ['latitude']],
        ['maxLongitude'],
        ['maxLatitude'],
        ['minLongitude'],
        ['minLatitude']
    ]);
});

describe('staticmap', function() {
    var StaticMap = require('../../../../src/server/rpc/procedures/static-map/static-map'),
        RPCMock = require('../../../assets/mock-rpc'),
        utils = require('../../../assets/utils'),
        staticmap = new RPCMock(StaticMap);

    before(function(done) {
        utils.connect()
            .then(() => {
                staticmap = new RPCMock(StaticMap);
                done();
            });
    });

    describe('interfaces', function() {
    });

    describe('interfaces', function() {
        utils.verifyRPCInterfaces(staticmap, [
            ['getMap', ['latitude', 'longitude', 'width', 'height', 'zoom']],
            ['getSatelliteMap', ['latitude', 'longitude', 'width', 'height', 'zoom']],
            ['getTerrainMap', ['latitude', 'longitude', 'width', 'height', 'zoom']],
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
});

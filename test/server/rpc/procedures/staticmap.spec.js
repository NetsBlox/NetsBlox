describe.only('staticmap', function() {
    var StaticMap,
        RPCMock = require('../../../assets/mock-rpc'),
        utils = require('../../../assets/utils'),
        storage = require('../../../../src/server/storage/storage'),
        staticmap;

    before(function(done) {
        storage.connect()
            .then(() => {
                console.log('connected!');
                StaticMap = require('../../../../src/server/rpc/procedures/static-map/static-map');
                staticmap = new RPCMock(StaticMap);
                done();
            });
    });

    describe('interfaces', function() {
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
});

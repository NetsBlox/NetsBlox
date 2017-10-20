describe('staticmap', function() {
    var StaticMap = require('../../../../src/server/rpc/procedures/google-maps/google-maps'),
        RPCMock = require('../../../assets/mock-rpc'),
        assert = require('assert'),
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
            ['getImageCoordinates', ['latitude', 'longitude']],
            ['getEarthCoordinates', ['x', 'y']],
            ['maxLongitude'],
            ['maxLatitude'],
            ['minLongitude'],
            ['getDistance', ['startLatitude', 'startLongitude', 'endLatitude', 'endLongitude']],
            ['minLatitude']
        ]);
    });

    describe('getDistance', function() {
        it('should calculate distance in meters (string input)', function(){
            let distance = staticmap.getDistance('36', '-86', '36', '-87');
            assert.deepEqual(distance, 90163);
        });
        it('should calculate distance in meters (integer input)', function(){
            let distance = staticmap.getDistance(36, -86, 36, -87);
            assert.deepEqual(distance, 90163);
        });
    });

});

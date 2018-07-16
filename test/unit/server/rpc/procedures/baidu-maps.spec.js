describe('baidu-maps', function() {
    const utils = require('../../../../assets/utils');
    var Baidumaps = utils.reqSrc('rpc/procedures/baidu-maps/baidu-maps'),
        RPCMock = require('../../../../assets/mock-rpc'),
        assert = require('assert'),
        baidumaps = new RPCMock(Baidumaps);

    before(function(done) {
        utils.connect()
            .then(() => {
                baidumaps = new RPCMock(Baidumaps);
                done();
            });
    });

    describe('interfaces', function() {
        utils.verifyRPCInterfaces(baidumaps, [
            ['getMap', ['latitude', 'longitude', 'width', 'height', 'zoom']],
            ['getLongitudeFromX', ['x']],
            ['getLatitudeFromY', ['y']],
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
            let distance = baidumaps.getDistance('36', '-86', '36', '-87');
            assert.deepEqual(distance, 90163);
        });
        it('should calculate distance in meters (integer input)', function(){
            let distance = baidumaps.getDistance(36, -86, 36, -87);
            assert.deepEqual(distance, 90163);
        });
    });

    describe('x,y to lat, lon', function() {
        // create a map near boundaries
        const map = {
            center: {
                lat: 36.152,
                lon: -150,
            },
            width: 480,
            height: 360,
            zoom: 2,
            scale: 1,
            mapType: 'roadmap'
        };

        it('should handle wraparound at map boundaries', function(){
            let coords = baidumaps._rpc._coordsAt(-170, 90, map);
            assert(coords.lon > -180 && coords.lon < 180);
            map.center.lon = +150;
            coords = baidumaps._rpc._coordsAt(170, 90, map);
            assert(coords.lon > -180 && coords.lon < 180);
        });

    });

    describe('getBaiduParams', function() {

        const opts = {
            center: {
                lat: 36.2645738345627,
                lon: -82.54322767345267,
            },
            width: (640 / 1),
            height: (480 / 1),
            zoom: 15
        };

        it('should round coordinates properly', function() {
            let params = baidumaps._rpc._getBaiduParams(opts, 4);
            let outCoords = params.match(/center=(.*)&ak/)[1];
            const expectedCoords = '-82.5432,36.2646';
            assert.equal(outCoords, expectedCoords);
        });

        it('should not round coordinates', function() {
            let params = baidumaps._rpc._getBaiduParams(opts);
            let outCoords = params.match(/center=(.*)&ak/)[1];
            const expectedCoords = '-82.54322767345268,36.2645738345627';
            assert.equal(outCoords, expectedCoords);
        });

    });

});

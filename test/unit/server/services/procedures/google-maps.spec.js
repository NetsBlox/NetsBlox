describe('googlemaps', function() {
    const utils = require('../../../../assets/utils');
    var Googlemaps = utils.reqSrc('services/procedures/google-maps/google-maps'),
        RPCMock = require('../../../../assets/mock-rpc'),
        assert = require('assert'),
        googlemaps = new RPCMock(Googlemaps);

    before(function(done) {
        utils.connect()
            .then(() => {
                googlemaps = new RPCMock(Googlemaps);
                done();
            });
    });

    describe('interfaces', function() {
        utils.verifyRPCInterfaces('GoogleMaps', [
            ['getMap', ['latitude', 'longitude', 'width', 'height', 'zoom']],
            ['getSatelliteMap', ['latitude', 'longitude', 'width', 'height', 'zoom']],
            ['getTerrainMap', ['latitude', 'longitude', 'width', 'height', 'zoom']],
            ['getLongitude', ['x']],
            ['getLatitude', ['y']],
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
            let distance = googlemaps.getDistance('36', '-86', '36', '-87');
            assert.deepEqual(distance, 90163);
        });
        it('should calculate distance in meters (integer input)', function(){
            let distance = googlemaps.getDistance(36, -86, 36, -87);
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
            let coords = googlemaps._rpc._coordsAt(-170, 90, map);
            assert(coords.lon > -180 && coords.lon < 180);
            map.center.lon = +150;
            coords = googlemaps._rpc._coordsAt(170, 90, map);
            assert(coords.lon > -180 && coords.lon < 180);
        });

    });

    describe('getGoogleParams', function() {

        const opts = {
            center: {
                lat: 36.2645738345627,
                lon: -82.5432276734527,
            },
            width: (640 / 1),
            height: (480 / 1),
            zoom: 15,
            scale: 1,
            mapType: 'roadmap'
        };

        it('should round coordinates properly', function() {
            const params = googlemaps._rpc._getGoogleParams(opts, 4);
            const outCoords = params.match(/center=(.*)&key/)[1];
            const expectedCoords = '36.2646,-82.5432';
            assert.equal(outCoords, expectedCoords);
        });

        it('should not round coordinates (large precision)', function() {
            const params = googlemaps._rpc._getGoogleParams(opts, 13);
            const outCoords = params.match(/center=(.*)&key/)[1];
            const expectedCoords = '36.2645738345627,-82.5432276734527';
            assert.equal(outCoords, expectedCoords);
        });

    });

});

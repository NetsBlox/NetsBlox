const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    var Googlemaps = utils.reqSrc('services/procedures/google-maps/google-maps'),
        MockService = require('../../../../assets/mock-service'),
        assert = require('assert'),
        googlemaps;

    before(async () => {
        await utils.connect();
        googlemaps = new MockService(Googlemaps);
    });
    after(() => googlemaps.destroy());

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
            let coords = googlemaps.unwrap()._coordsAt(-170, 90, map);
            assert(coords.lon > -180 && coords.lon < 180);
            map.center.lon = +150;
            coords = googlemaps.unwrap()._coordsAt(170, 90, map);
            assert(coords.lon > -180 && coords.lon < 180);
        });

    });

    describe('toPrecision', function() {
        const latitude = 36.2645738345627;

        it('should round coordinates properly', function() {
            const rounded = googlemaps.unwrap()._toPrecision(latitude, 4);
            assert.equal(rounded, 36.2646);
        });

        it('should not round coordinates (large precision)', function() {
            const rounded = googlemaps.unwrap()._toPrecision(latitude, 13);
            assert.equal(rounded, 36.2645738345627);
        });

    });

});

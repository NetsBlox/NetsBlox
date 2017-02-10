describe('air quality', function() {
    var AirQuality = require('../../../../src/server/rpc/procedures/air-quality/air-quality'),
        RPCMock = require('../../../assets/mock-rpc'),
        airquality,
        assert = require('assert');

    before(function() {
        airquality = new RPCMock(AirQuality);
    });

    describe('qualityIndex', function() {
        it('should accept latitude and longitude', function() {
            var args = airquality.getArgumentsFor('qualityIndex');
            assert(args.includes('latitude'));
            assert(args.includes('longitude'));
        });
    });
});

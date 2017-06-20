describe('weather', function() {
    const assert = require('assert');
    var Weather = require('../../../../src/server/rpc/procedures/weather/weather'),
        RPCMock = require('../../../assets/mock-rpc'),
        utils = require('../../../assets/utils'),
        weather = new RPCMock(Weather);

    utils.verifyRPCInterfaces(weather, [
        ['temp', ['latitude', 'longitude']],
        ['humidity', ['latitude', 'longitude']],
        ['description', ['latitude', 'longitude']],
        ['windSpeed', ['latitude', 'longitude']],
        ['windAngle', ['latitude', 'longitude']],
        ['icon', ['latitude', 'longitude']]
    ]);

    describe('input validation', function() {
        it('should send error message if non-numeric inputs', function() {
            weather.temp('hello', 'world');
            assert(weather.response.response.includes('ERROR'));
        });

        it('should send error message if out of range lat', function() {
            weather.temp(-91, 0);
            assert(weather.response.response.includes('ERROR'));
            assert(weather.response.response.includes('latitude'));
        });

        it('should send error message if out of range lng', function() {
            weather.temp(0, -181);
            assert(weather.response.response.includes('ERROR'));
            assert(weather.response.response.includes('longitude'));
        });
    });
});

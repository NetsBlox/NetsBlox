describe('weather', function() {
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
});

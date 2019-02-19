describe('weather', function() {
    const utils = require('../../../../assets/utils');
    var Weather = utils.reqSrc('rpc/procedures/weather/weather'),
        RPCMock = require('../../../../assets/mock-rpc'),
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

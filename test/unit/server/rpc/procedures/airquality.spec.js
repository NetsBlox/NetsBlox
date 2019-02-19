describe('air-quality', function() {
    const utils = require('../../../../assets/utils');
    var AirQualityService = utils.reqSrc('rpc/procedures/air-quality/air-quality'),
        RPCMock = require('../../../../assets/mock-rpc'),
        airquality = new RPCMock(AirQualityService);

    utils.verifyRPCInterfaces(airquality, [
        ['qualityIndex', ['latitude', 'longitude']],
        ['aqi', ['latitude', 'longitude']],
        ['qualityIndexByZipCode', ['zipCode']],
    ]);
});

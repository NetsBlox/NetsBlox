describe('air-quality', function() {
    const utils = require('../../../../assets/utils');

    utils.verifyRPCInterfaces('AirQuality', [
        ['qualityIndex', ['latitude', 'longitude']],
        ['aqi', ['latitude', 'longitude']],
        ['qualityIndexByZipCode', ['zipCode']],
    ]);
});

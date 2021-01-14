const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    utils.verifyRPCInterfaces('AirQuality', [
        ['qualityIndex', ['latitude', 'longitude']],
        ['aqi', ['latitude', 'longitude']],
        ['qualityIndexByZipCode', ['zipCode']],
    ]);
});

describe('nasa', function() {
    const utils = require('../../../../assets/utils');

    utils.verifyRPCInterfaces('NASA', [
        ['apodDetails'],
        ['apod'],
        ['apodMedia'],
        ['marsHighTemp'],
        ['marsLowTemp'],
        ['marsWeather']
    ]);
});

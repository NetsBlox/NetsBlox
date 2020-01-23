describe('nasa', function() {
    const utils = require('../../../../assets/utils');

    utils.verifyRPCInterfaces('NASA', [
        ['apod'],
        ['apodMedia'],
        ['marsHighTemp'],
        ['marsLowTemp'],
        ['marsWeather']
    ]);
});

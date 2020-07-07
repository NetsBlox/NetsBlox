describe('weather', function() {
    const utils = require('../../../../assets/utils');

    utils.verifyRPCInterfaces('Weather', [
        ['temperature', ['latitude', 'longitude']],
        ['temp', ['latitude', 'longitude']],
        ['humidity', ['latitude', 'longitude']],
        ['description', ['latitude', 'longitude']],
        ['windSpeed', ['latitude', 'longitude']],
        ['windAngle', ['latitude', 'longitude']],
        ['icon', ['latitude', 'longitude']]
    ]);
});

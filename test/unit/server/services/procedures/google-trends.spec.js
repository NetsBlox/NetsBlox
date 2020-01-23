describe('google-trends', function() {
    const utils = require('../../../../assets/utils');

    utils.verifyRPCInterfaces('GoogleTrends', [
        ['byLocation', ['latitude', 'longitude']],
        ['byCountryCode', ['countryCode']]
    ]);
});

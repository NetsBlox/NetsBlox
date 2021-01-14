const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    utils.verifyRPCInterfaces('GoogleTrends', [
        ['byLocation', ['latitude', 'longitude']],
        ['byCountryCode', ['countryCode']]
    ]);
});

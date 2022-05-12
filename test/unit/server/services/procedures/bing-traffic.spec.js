const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    utils.verifyRPCInterfaces('BingTraffic', [
        ['search', ['westLongitude', 'northLatitude', 'eastLongitude', 'southLatitude']],
        ['stop']
    ]);
});

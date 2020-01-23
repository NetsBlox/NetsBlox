describe('traffic', function() {
    const utils = require('../../../../assets/utils');
    utils.verifyRPCInterfaces('Traffic', [
        ['search', ['westLongitude', 'northLatitude', 'eastLongitude', 'southLatitude']],
        ['stop']
    ]);
});

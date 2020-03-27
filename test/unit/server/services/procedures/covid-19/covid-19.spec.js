describe('COVID-19', function() {
    const utils = require('../../../../../assets/utils');

    utils.verifyRPCInterfaces('COVID-19', [
        ['getLocationsWithData'],
        ['getLocationCoordinates', ['country', 'state']],
        ['getRecoveredCounts', ['country', 'state']],
        ['getDeathCounts', ['country', 'state']],
        ['getConfirmedCounts', ['country', 'state']],
    ]);
});

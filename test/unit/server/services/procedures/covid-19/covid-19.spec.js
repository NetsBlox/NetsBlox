describe('COVID-19', function() {
    const utils = require('../../../../../assets/utils');

    utils.verifyRPCInterfaces('COVID-19', [
        ['getLocationsWithData'],
        ['getLocationCoordinates', ['country', 'state', 'city']],
        ['getRecoveredCounts', ['country', 'state', 'city']],
        ['getDeathCounts', ['country', 'state', 'city']],
        ['getConfirmedCounts', ['country', 'state', 'city']],
    ]);
});

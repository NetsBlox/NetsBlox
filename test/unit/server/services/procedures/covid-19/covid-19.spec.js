const utils = require('../../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    utils.verifyRPCInterfaces('COVID-19', [
        ['getLocationsWithData'],
        ['getLocationCoordinates', ['country', 'state', 'city']],
        ['getRecoveredCounts', ['country', 'state', 'city']],
        ['getDeathCounts', ['country', 'state', 'city']],
        ['getConfirmedCounts', ['country', 'state', 'city']],
    ]);
});

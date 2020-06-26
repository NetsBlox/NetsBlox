describe('icesheets', function() {
    const utils = require('../../../../assets/utils');

    utils.verifyRPCInterfaces('EarthOrbit', [
        ['getd180', ['startyear', 'endyear']],
        ['getd180error', ['startyear', 'endyear']],
        ['getAveSedRates', ['startyear', 'endyear']],
        ['getNormalizedSedRates', ['startyear', 'endyear']],
        ['gets95Time', ['startyear', 'endyear']],
        ['getsspecMapTime', ['startyear', 'endyear']]
    ]);
});
describe('Icesheets', function() {
    const utils = require('../../../../assets/utils');

    utils.verifyRPCInterfaces('Icesheets', [
        ['getDelta18O', ['startyear', 'endyear']],
        ['getDelta18Oerror', ['startyear', 'endyear']],
        ['getAverageSedimentationRates', ['startyear', 'endyear']],
        ['getNormalizedSedimentaionRates', ['startyear', 'endyear']]
    ]);
});
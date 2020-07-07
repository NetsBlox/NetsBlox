describe('PaleoceanOxygenIsotopes', function() {
    const utils = require('../../../../assets/utils');

    utils.verifyRPCInterfaces('PaleoceanOxygenIsotopes', [
        ['getDelta18O', ['startyear', 'endyear']],
        ['getDelta18OError', ['startyear', 'endyear']],
        ['getAverageSedimentationRates', ['startyear', 'endyear']],
        ['getNormalizedSedimentationRates', ['startyear', 'endyear']]
    ]);
});
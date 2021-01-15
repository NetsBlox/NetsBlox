const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    utils.verifyRPCInterfaces('PaleoceanOxygenIsotopes', [
        ['getDelta18O', ['startyear', 'endyear']],
        ['getDelta18OError', ['startyear', 'endyear']],
        ['getAverageSedimentationRates', ['startyear', 'endyear']],
        ['getNormalizedSedimentationRates', ['startyear', 'endyear']]
    ]);
});

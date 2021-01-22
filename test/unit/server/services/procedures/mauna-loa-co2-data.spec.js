const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    utils.verifyRPCInterfaces('MaunaLoaCO2Data', [
        ['getRawCO2', ['startyear', 'endyear']],
        ['getCO2Trend', ['startyear', 'endyear']],
    ]);
});

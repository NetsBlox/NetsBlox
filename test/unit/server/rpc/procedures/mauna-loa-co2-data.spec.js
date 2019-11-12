describe('mauna-loa-co2-data', function() {
    const utils = require('../../../../assets/utils');

    utils.verifyRPCInterfaces('MaunaLoaCO2Data', [
        ['getRawCO2', ['startyear', 'endyear']],
        ['getCO2Trend', ['startyear', 'endyear']],
    ]);
});

describe('hawaii-co2-data', function() {
    const utils = require('../../../../assets/utils');

    utils.verifyRPCInterfaces('HawaiiCO2Data', [
        ['getCarbonDioxideData', ['startyear', 'endyear']],
        ['getCO2TrendData', ['startyear', 'endyear']],
    ]);
});

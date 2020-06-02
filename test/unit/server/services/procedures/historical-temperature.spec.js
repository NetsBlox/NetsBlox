describe('historical-temperature', function() {
    const utils = require('../../../../assets/utils');

    utils.verifyRPCInterfaces('HistoricalTemperature', [
        ['monthlyAnomaly', ['region']],
        ['annualAnomaly', ['region']],
        ['fiveYearAnomaly', ['region']],
        ['tenYearAnomaly', ['region']],
        ['twentyYearAnomaly', ['region']],
    ]);
});

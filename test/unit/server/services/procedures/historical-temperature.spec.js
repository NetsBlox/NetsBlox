const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    utils.verifyRPCInterfaces('HistoricalTemperature', [
        ['monthlyAnomaly', ['region']],
        ['annualAnomaly', ['region']],
        ['fiveYearAnomaly', ['region']],
        ['tenYearAnomaly', ['region']],
        ['twentyYearAnomaly', ['region']],
    ]);
});

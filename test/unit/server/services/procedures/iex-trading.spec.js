const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    utils.verifyRPCInterfaces('IEXTrading', [
        ['currentPrice', ['companySymbol']],
        ['lastOpenPrice', ['companySymbol']],
        ['lastClosePrice', ['companySymbol']],
        ['companyInformation', ['companySymbol']],
        ['dailyPercentChange', ['companySymbol']],
        ['historicalClosingPrices', ['companySymbol', 'range']],
    ]);
});

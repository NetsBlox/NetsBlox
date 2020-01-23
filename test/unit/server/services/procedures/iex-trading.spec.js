describe('iex-trading', function() {
    const utils = require('../../../../assets/utils');

    utils.verifyRPCInterfaces('IEXTrading', [
        ['currentPrice', ['companySymbol']],
        ['lastOpenPrice', ['companySymbol']],
        ['lastClosePrice', ['companySymbol']],
        ['companyInformation', ['companySymbol']],
        ['dailyPercentChange', ['companySymbol']],
        ['historicalClosingPrices', ['companySymbol', 'range']],
    ]);
});

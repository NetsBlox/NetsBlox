describe('iex-trading', function() {
    const utils = require('../../../../assets/utils');
    var StockService = utils.reqSrc('rpc/procedures/iex-trading/iex-trading'),
        RPCMock = require('../../../../assets/mock-rpc'),
        stocks = new RPCMock(StockService);

    utils.verifyRPCInterfaces(stocks, [
        ['currentPrice', ['companySymbol']],
        ['lastOpenPrice', ['companySymbol']],
        ['lastClosePrice', ['companySymbol']],
        ['companyInformation', ['companySymbol']],
        ['dailyPercentChange', ['companySymbol']],
        ['historicalClosingPrices', ['companySymbol', 'range']],
    ]);
});

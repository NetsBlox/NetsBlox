describe('azure-translation', function() {
    const utils = require('../../../../assets/utils');
    var StockService = utils.reqSrc('rpc/procedures/azure-translation/azure-translation'),
        RPCMock = require('../../../../assets/mock-rpc'),
        stocks = new RPCMock(StockService);

    utils.verifyRPCInterfaces(stocks, [
        ['toEnglish', ['text']],
    ]);
});

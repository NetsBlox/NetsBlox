const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    utils.verifyRPCInterfaces('AlphaVantage', [
        ['convertCurrency', ['fromSymbol', 'amount', 'toSymbol']],
        ['currencySymbolSearch', ['search']],
        ['equitiesSymbolSearch', ['search']],
        ['getCryptoData', ['symbol', 'interval', 'attributes', 'dateFormat']],
        ['getEquityData', ['symbol', 'interval', 'attributes', 'dateFormat']],
        ['getExchangeData', ['fromSymbol', 'toSymbol', 'interval', 'attributes', 'dateFormat']],
    ]);
});

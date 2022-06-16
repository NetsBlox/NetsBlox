/**
 * This API returns intraday time series of the equity specified,
 * covering extended trading hours where applicable (e.g., 4:00am to 8:00pm Eastern Time for the US market).
 * The intraday data is derived from the Securities Information Processor (SIP) market-aggregated data.
 * Terms of use: https://www.alphavantage.co/termsOfService/
 * @service
 * @alpha
 */

const ApiConsumer = require('../utils/api-consumer');
const {GlobalEquitiesKey} = require('../utils/api-key');
const baseUrl = 'https://alphavantage.co';
const GlobalEquities = new ApiConsumer('GlobalEquities', baseUrl, {cache: {ttl: 30}});
ApiConsumer.setRequiredApiKey(GlobalEquities, GlobalEquitiesKey);
const currencyTypes = require('./currency-types');
const types = require('../../input-types');

types.defineType({
    name: 'TimePeriod',
    description: 'Frequency of data to return.',
    baseType: 'Enum',
    baseParams: { '1 min': 1, '5 min': 5, '15 min': 15, '30 min': 30,'60 min':60,'Daily':'daily','Weekly':'weekly','Monthly':'monthly'},
});
types.defineType({
    name: 'DateFormat',
    description: 'Type of date format to return.',
    baseType: 'Enum',
    baseParams: ['traditional', 'fractional'],
});
types.defineType({
    name: 'EquityField',
    description: 'A specific field of equity data to return.',
    baseType: 'Enum',
    baseParams: ['all', 'open', 'high', 'low', 'close', 'volume'],
});

const DATA_SOURCE_LIFETIME = 1 * 24 * 60 * 60 * 1000;
let CACHED_DATA = undefined;
let CACHE_TIME_STAMP = undefined;
async function getStockSymbol() {
    if (CACHED_DATA !== undefined && Date.now() - CACHE_TIME_STAMP <= DATA_SOURCE_LIFETIME) return CACHED_DATA;

    const resultSet = [];
    const data = await GlobalEquities._requestData({path:'query', queryString:`function=LISTING_STATUS&apikey=${GlobalEquities.apiKey.value}`});
    for (const line of data.split('\n')) {
        const categories = line.split(',');
        const ticker = categories[0];
        const companyName = categories[1];
        if (ticker !== undefined && companyName !== undefined) {
            resultSet.push([ticker, companyName]);
        }
    }

    CACHED_DATA = resultSet;
    CACHE_TIME_STAMP = Date.now();
    return resultSet;
}

function parseFractionalYear(value) {
    const year = parseInt(value.substring(0, value.indexOf('-')));
    const yearDate = new Date(year.toString());
    const frac = (new Date(value) - yearDate) / (new Date((year + 1).toString()) - yearDate);
    return year + frac;
}

/**
 * @param {BoundedString<2>} search String to search for matches
 * @return {Array} Array of results
 */
GlobalEquities.equitiesSymbolSearch = async function(search){
    const matches = [];
    for (const element of await getStockSymbol()) {
        if (element[1] !== undefined && (element[1].toLowerCase()).includes(search.toLowerCase())) {
            matches.push([element[0], element[1]]);
        }
    }
    return matches;
};

GlobalEquities._rawSearchEquities = async function(apifunction, symbol, interval, attributes, dateFormat) {
    let data, labelAppend;
    if (apifunction == 'TIME_SERIES_INTRADAY') {
        data = await this._requestData({path:'query', queryString:`function=${apifunction}&symbol=${symbol}&interval=${interval}min&apikey=${this.apiKey.value}`});
        labelAppend = `Time Series (${interval}min)`; 
    }
    else if (apifunction == 'TIME_SERIES_DAILY') {
        data = await this._requestData({path:'query', queryString:`function=${apifunction}&symbol=${symbol}&apikey=${this.apiKey.value}`});
        labelAppend = 'Time Series (Daily)';
    }
    else if (apifunction == 'TIME_SERIES_WEEKLY') {
        data = await this._requestData({path:'query', queryString:`function=${apifunction}&symbol=${symbol}&apikey=${this.apiKey.value}`});
        labelAppend = 'Weekly Time Series';
    }
    else if (apifunction == 'TIME_SERIES_MONTHLY') {
        data = await this._requestData({path:'query', queryString:`function=${apifunction}&symbol=${symbol}&apikey=${this.apiKey.value}`});
        labelAppend = 'Monthly Time Series';
    }
    else throw Error(`Unknown apifunction: ${apifunction}`);

    if ("Error Message" in data) {
        throw new Error(`Unknown symbol: ${symbol}`);
    }

    // Properties within the second property ("Time Series: (XX min)")
    const matches = [];

    // Fill time series with time tag and open/high/close
    for (const entry in data[`${labelAppend}`]) {
        const timeseries = [(dateFormat === 'fractional' ? parseFractionalYear(entry) : new Date(entry)).toString()];

        // Push the rest of the information
        const raw = data[`${labelAppend}`][entry];
        const cleaned = {
            'open': parseFloat(raw['1. open']),
            'high': parseFloat(raw['2. high']),
            'low': parseFloat(raw['3. low']),
            'close': parseFloat(raw['4. close']),
            'volume': parseFloat(raw['5. volume']),
        };
        timeseries.push(attributes !== 'all' ? cleaned[attributes] : cleaned);

        matches.push(timeseries);
    }
    return matches;
};

/**
 * Get data of publicly traded stocks
 * @param {String} symbol Ticker symbol
 * @param {TimePeriod=} interval If intraday
 * @param {EquityField=} attributes May be all or only 1
 * @param {DateFormat} dateFormat Date return format
 * @return {Array} Array of time stamps and associated stock price
 */
GlobalEquities.getEquityData = function(symbol = 'IBM', interval = 5, attributes = 'all', dateFormat = 'traditional') {
    symbol = symbol.toUpperCase();
    const apiFuncs = { daily: 'TIME_SERIES_DAILY', weekly: 'TIME_SERIES_WEEKLY', monthly: 'TIME_SERIES_MONTHLY'};
    const apiFunc = apiFuncs[interval];
    if (apiFunc == undefined) {
        return GlobalEquities._rawSearchEquities('TIME_SERIES_INTRADAY', symbol, interval, attributes, dateFormat);
    }
    return GlobalEquities._rawSearchEquities(apiFunc,symbol, null, attributes, dateFormat);
};

GlobalEquities._rawSearchCrypto = async function(apifunction, symbol, interval, market, attributes, dateFormat) {
    let data, labelAppend;
    if (apifunction == 'CRYPTO_INTRADAY') {
        data = await this._requestData({path:'query', queryString:`function=${apifunction}&symbol=${symbol}&interval=${interval}min&market=${market}&apikey=${this.apiKey.value}`});
        labelAppend = `Time Series Crypto (${interval}min)`; 
    }
    else if (apifunction == 'DIGITAL_CURRENCY_DAILY') {
        data = await this._requestData({path:'query', queryString:`function=${apifunction}&symbol=${symbol}&market=${market}&apikey=${this.apiKey.value}`});
        labelAppend = 'Time Series (Digital Currency Daily)';
    }
    else if (apifunction == 'DIGITAL_CURRENCY_WEEKLY') {
        data = await this._requestData({path:'query', queryString:`function=${apifunction}&symbol=${symbol}&market=${market}&apikey=${this.apiKey.value}`});
        labelAppend = 'Time Series (Digital Currency Weekly)';
    }
    else if (apifunction == 'DIGITAL_CURRENCY_MONTHLY') {
        data = await this._requestData({path:'query', queryString:`function=${apifunction}&symbol=${symbol}&market=${market}&apikey=${this.apiKey.value}`});
        labelAppend = 'Time Series (Digital Currency Monthly)';
    }
    else throw Error(`Unknown apifunction: ${apifunction}`);

    if ("Error Message" in data) {
        throw new Error(`Unknown symbol: ${symbol}`);
    }

    const matches = []; // Properties within the second property ("Time Series: (XX min)")

    // Fill time series with time tag and open/high/close
    for (const entry in data[`${labelAppend}`]) {
        const timeseries = [(dateFormat === 'fractional' ? parseFractionalYear(entry) : new Date(entry)).toString()];

        // Push the rest of the information
        const raw = data[`${labelAppend}`][entry];
        let cleaned;
        if (apifunction == 'CRYPTO_INTRADAY') {
            cleaned = {
                'open': parseFloat(raw['1. open']),
                'high': parseFloat(raw['2. high']),
                'low': parseFloat(raw['3. low']),
                'close': parseFloat(raw['4. close']),
                'volume': parseFloat(raw['5. volume'])
            };
        }
        else {
            cleaned = {
                'open': parseFloat(raw['1b. open (USD)']),
                'high': parseFloat(raw['2b. high (USD)']),
                'low': parseFloat(raw['3b. low (USD)']),
                'close': parseFloat(raw['4b. close (USD)']),
                'volume': parseFloat(raw['5. volume'])
            };
        }
        timeseries.push(attributes !== 'all' ? cleaned[attributes] : cleaned);

        matches.push(timeseries);
    }
    return matches;
};

/**
 * Get data of cryptocurrencies / digital currencies in USD
 * @param {String} symbol Crypto symbol
 * @param {TimePeriod=} interval Interval selected by user
 * @param {EquityField=} attributes May be all or only 1
 * @param {DateFormat} dateFormat Date return format
 * @return {Array} Array of time stamps and associated stock price
*/
GlobalEquities.getCryptoData = function(symbol = 'ETH', interval = 5, attributes = 'all', dateFormat = 'traditional') {
    symbol = symbol.toUpperCase();
    const apiFuncs = { daily: 'DIGITAL_CURRENCY_DAILY', weekly: 'DIGITAL_CURRENCY_WEEKLY', monthly: 'DIGITAL_CURRENCY_MONTHLY'};
    const apiFunc = apiFuncs[interval];
    if (apiFunc == undefined) {
        return GlobalEquities._rawSearchCrypto('CRYPTO_INTRADAY', symbol, interval, 'USD', attributes, dateFormat);
    }
    return GlobalEquities._rawSearchCrypto(apiFunc,symbol, null, 'USD', attributes, dateFormat);
};

GlobalEquities._rawSearchForex = async function(apifunction, fromSymbol, toSymbol, interval, attributes, dateFormat) {
    let data, labelAppend;
    if (apifunction == 'FX_INTRADAY') {
        data = await this._requestData({path:'query', queryString:`function=${apifunction}&from_symbol=${fromSymbol}&to_symbol=${toSymbol}&interval=${interval}min&apikey=${this.apiKey.value}`});
        labelAppend = `Time Series FX (${interval}min)`;
    }
    else if (apifunction == 'FX_DAILY') {
        data = await this._requestData({path:'query', queryString:`function=${apifunction}&from_symbol=${fromSymbol}&to_symbol=${toSymbol}&apikey=${this.apiKey.value}`});
        labelAppend = 'Time Series FX (Daily)';
    }
    else if (apifunction == 'FX_WEEKLY') {
        data = await this._requestData({path:'query', queryString:`function=${apifunction}&from_symbol=${fromSymbol}&to_symbol=${toSymbol}&apikey=${this.apiKey.value}`});
        labelAppend = 'Time Series FX (Weekly)';
    }
    else if (apifunction == 'FX_MONTHLY') {
        data = await this._requestData({path:'query', queryString:`function=${apifunction}&from_symbol=${fromSymbol}&to_symbol=${toSymbol}&apikey=${this.apiKey.value}`});
        labelAppend = 'Time Series FX (Monthly)';
    }
    else throw Error(`Unknown apifunction: ${apifunction}`);

    if ("Error Message" in data) {
        throw new Error(`Unknown currency: ${fromSymbol} or ${toSymbol}`);
    }

    const matches = []; // Properties within the second property ("Time Series: (XX min)")

    // Fill time series with time tag and open/high/close
    for (const entry in data[`${labelAppend}`]) {
        const timeseries = [(dateFormat === 'fractional' ? parseFractionalYear(entry) : new Date(entry)).toString()];

        // Push the rest of the information
        const raw = data[`${labelAppend}`][entry];
        cleaned = {
            'open': parseFloat(raw['1. open']),
            'high': parseFloat(raw['2. high']),
            'low': parseFloat(raw['3. low']),
            'close': parseFloat(raw['4. close']),
        };
        timeseries.push(attributes !== 'all' ? cleaned[attributes] : cleaned);

        matches.push(timeseries);
    }
    return matches;
};

/**
 * Get data of cryptocurrencies / digital currencies in USD
 * @param {String} fromSymbol Crypto symbol to convert from
 * @param {String} toSymbol Crypto symbol to convert to
 * @param {TimePeriod=} interval Interval selected by user
 * @param {EquityField=} attributes May be all or only 1
 * @param {DateFormat} dateFormat Date return format
 * @return {Array} Array of time stamps and associated stock price
*/
GlobalEquities.getForexData = function(fromSymbol = 'USD', toSymbol = 'CNY', interval = 5, attributes = 'all', dateFormat = 'traditional') {
    fromSymbol = fromSymbol.toUpperCase();
    toSymbol = toSymbol.toUpperCase();
    const apiFuncs = { daily: 'FX_DAILY', weekly: 'FX_WEEKLY', monthly: 'FX_MONTHLY'};
    const apiFunc = apiFuncs[interval];
    if (apiFunc == undefined) {
        return GlobalEquities._rawSearchForex('FX_INTRADAY', fromSymbol, toSymbol, interval, attributes, dateFormat);
    }
    return GlobalEquities._rawSearchForex(apiFunc,fromSymbol, toSymbol, null, attributes, dateFormat);
};

/**
 * Get data of publicly traded stocks
 * @param {String} fromSymbol Ticker symbol to convert from
 * @param {Integer} amount Amount to convert
 * @param {String} toSymbol Ticker symbol to convert to
 * @return {Array} Array of time stamps and associated stock price
 */
GlobalEquities.convertCurrency = async function(fromSymbol = 'USD', amount = 1, toSymbol = 'CNY') {
    fromSymbol = fromSymbol.toUpperCase();
    toSymbol = toSymbol.toUpperCase();
    const data = await this._requestData({path:'query', queryString:`function=CURRENCY_EXCHANGE_RATE&from_currency=${fromSymbol}&to_currency=${toSymbol}&apikey=${this.apiKey.value}`});
    if ("Error Message" in data) {
        throw new Error(`Unknown currencies: ${fromSymbol} or ${toSymbol}`);
    }
    const valueEntry = data['Realtime Currency Exchange Rate']['5. Exchange Rate'];
    return parseFloat(valueEntry) * amount;
};

/**
* @param {BoundedString<2>} search String to search for matches
* @return {Array} Array of results
*/
GlobalEquities.currencySymbolSearch = function (search) {
    const matches = [];
    for (const element of currencyTypes) {
        if ((element[0].toLowerCase()).includes(search.toLowerCase())) {
            matches.push([element[0], element[1]]);
        }
    }
    return matches;
};

module.exports = GlobalEquities;

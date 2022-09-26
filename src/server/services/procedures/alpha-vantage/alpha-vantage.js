/**
 * AlphaVantage gives access to time series data various types of equities, including stocks, currency, and cryptocurrency.
 * The intraday data is derived from the Securities Information Processor (SIP) market-aggregated data.
 * `Terms of service <https://www.alphavantage.co/terms_of_service/>`__.
 * @service
 * @alpha
 */

const ApiConsumer = require('../utils/api-consumer');
const {AlphaVantageKey} = require('../utils/api-key');
const baseUrl = 'https://alphavantage.co';
const AlphaVantage = new ApiConsumer('AlphaVantage', baseUrl, {cache: {ttl: 30}});
ApiConsumer.setRequiredApiKey(AlphaVantage, AlphaVantageKey);
const currencyTypes = require('./currency-types');
const types = require('../../input-types');

types.defineType({
    name: 'TimePeriod',
    description: 'Frequency of time series data to return from :doc:`/services/AlphaVantage/index`.',
    baseType: 'Enum',
    baseParams: { '1 min': 1, '5 min': 5, '15 min': 15, '30 min': 30,'60 min': 60, 'daily': 'daily', 'weekly': 'weekly', 'monthly': 'monthly'},
});
types.defineType({
    name: 'DateFormat',
    description: 'Type of date format to return from :doc:`/services/AlphaVantage/index`. This is either ``traditional``, which is a human-readable format, or ``fractional``, which is the year plus a fractional component representing the month, day, etc. into said year. ``fractional`` is useful for plotting data using :func:`Chart.draw`.',
    baseType: 'Enum',
    baseParams: ['traditional', 'fractional'],
});
types.defineType({
    name: 'EquityField',
    description: 'A specific field of equity data to return from :doc:`/services/AlphaVantage/index`.',
    baseType: 'Enum',
    baseParams: ['all', 'open', 'high', 'low', 'close', 'volume'],
});

const DATA_SOURCE_LIFETIME = 1 * 24 * 60 * 60 * 1000;
let CACHED_DATA = undefined;
let CACHE_TIME_STAMP = undefined;
async function getStockSymbol() {
    if (CACHED_DATA !== undefined && Date.now() - CACHE_TIME_STAMP <= DATA_SOURCE_LIFETIME) return CACHED_DATA;

    const resultSet = [];
    const data = await AlphaVantage._requestData({path:'query', queryString:`function=LISTING_STATUS&apikey=${AlphaVantage.apiKey.value}`});
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
 * Search for a type of equity (stock) by name.
 * @param {BoundedString<2>} search String to search for matches.
 * @returns {Array<Tuple<String, String>>} List of search results, which are pairs of ``name`` and ``symbol``.
 */
AlphaVantage.equitiesSymbolSearch = async function(search) {
    search = search.toLowerCase();

    const matches = [];
    for (const element of await getStockSymbol()) {
        if (element[1] !== undefined && (element[1].toLowerCase()).includes(search)) {
            matches.push([element[1], element[0]]);
        }
    }
    return matches;
};

AlphaVantage._rawSearchEquities = async function(apifunction, symbol, interval, attributes, dateFormat, startDate, endDate) {
    startDate = startDate ? +startDate : -Infinity;
    endDate = endDate ? +endDate : Infinity;

    let data, labelAppend;
    if (apifunction == 'TIME_SERIES_INTRADAY') {
        data = await this._requestData({path:'query', queryString:`function=${apifunction}&outputsize=full&symbol=${symbol}&interval=${interval}min&apikey=${this.apiKey.value}`});
        labelAppend = `Time Series (${interval}min)`; 
    }
    else if (apifunction == 'TIME_SERIES_DAILY') {
        data = await this._requestData({path:'query', queryString:`function=${apifunction}&outputsize=full&symbol=${symbol}&apikey=${this.apiKey.value}`});
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

    if ('Error Message' in data) {
        throw new Error(`Unknown symbol: ${symbol}`);
    }

    // Properties within the second property ("Time Series: (XX min)")
    const matches = [];

    // Fill time series with time tag and open/high/close
    for (const entry in data[labelAppend]) {
        const t = new Date(entry);
        const t_ms = +t;
        if (t_ms < startDate || t_ms > endDate) continue;

        const timeseries = [(dateFormat === 'fractional' ? parseFractionalYear(entry) : t).toString()];

        // Push the rest of the information
        const raw = data[labelAppend][entry];
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

    matches.reverse(); // make chronological
    return matches;
};

/**
 * Get time series data about the value of publicly traded equities (stocks).
 * To find equity symbol names, you can use :func:`AlphaVantage.equitiesSymbolSearch`.
 * @param {String} symbol The equity symbol name.
 * @param {TimePeriod} interval The interval of time series data to return.
 * @param {EquityField=} attributes A specific attribute/field of data to return for each entry, or ``all`` to return all entries (default: ``all``).
 * @param {DateFormat=} dateFormat The date format to return for each entry (default: ``traditional``).
 * @param {Date=} startDate The first date of results to include (defaults to no cutoff).
 * @param {Date=} endDate The last date of results to include (defaults to no cutoff).
 * @returns {Array<Tuple<Any, Any>>} Array of time series results, which are pairs of ``time`` and ``data``.
 */
AlphaVantage.getEquityData = function(symbol, interval, attributes = 'all', dateFormat = 'traditional', startDate, endDate) {
    symbol = symbol.toUpperCase();
    const apiFuncs = { daily: 'TIME_SERIES_DAILY', weekly: 'TIME_SERIES_WEEKLY', monthly: 'TIME_SERIES_MONTHLY'};
    const apiFunc = apiFuncs[interval];
    if (apiFunc == undefined) {
        return AlphaVantage._rawSearchEquities('TIME_SERIES_INTRADAY', symbol, interval, attributes, dateFormat, startDate, endDate);
    }
    return AlphaVantage._rawSearchEquities(apiFunc,symbol, null, attributes, dateFormat, startDate, endDate);
};

AlphaVantage._rawSearchCrypto = async function(apifunction, symbol, interval, market, attributes, dateFormat, startDate, endDate) {
    startDate = startDate ? +startDate : -Infinity;
    endDate = endDate ? +endDate : Infinity;

    let data, labelAppend;
    if (apifunction == 'CRYPTO_INTRADAY') {
        data = await this._requestData({path:'query', queryString:`function=${apifunction}&outputsize=full&symbol=${symbol}&interval=${interval}min&market=${market}&apikey=${this.apiKey.value}`});
        labelAppend = `Time Series Crypto (${interval}min)`; 
    }
    else if (apifunction == 'DIGITAL_CURRENCY_DAILY') {
        data = await this._requestData({path:'query', queryString:`function=${apifunction}&outputsize=full&symbol=${symbol}&market=${market}&apikey=${this.apiKey.value}`});
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

    if ('Error Message' in data) {
        throw new Error(`Unknown symbol: ${symbol}`);
    }

    const matches = []; // Properties within the second property ("Time Series: (XX min)")

    // Fill time series with time tag and open/high/close
    for (const entry in data[labelAppend]) {
        const t = new Date(entry);
        const t_ms = +t;
        if (t_ms < startDate || t_ms > endDate) continue;

        const timeseries = [(dateFormat === 'fractional' ? parseFractionalYear(entry) : t).toString()];

        // Push the rest of the information
        const raw = data[labelAppend][entry];
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

    matches.reverse(); // make chronological
    return matches;
};

/**
 * Get time series data about the value of cryptocurrencies (digital currencies) in USD.
 * To convert currency values, you can use :func:`AlphaVantage.convertCurrency`.
 * @param {String} symbol The cryptocurrency symbol name.
 * @param {TimePeriod} interval The interval of time series data to return.
 * @param {EquityField=} attributes A specific attribute/field of data to return for each entry, or ``all`` to return all entries (default: ``all``).
 * @param {DateFormat=} dateFormat The date format to return for each entry (default: ``traditional``).
 * @param {Date=} startDate The first date of results to include (defaults to no cutoff).
 * @param {Date=} endDate The last date of results to include (defaults to no cutoff).
 * @returns {Array<Tuple<Any, Any>>} Array of time series results, which are pairs of ``time`` and ``data``.
 */
AlphaVantage.getCryptoData = function(symbol, interval, attributes = 'all', dateFormat = 'traditional', startDate, endDate) {
    symbol = symbol.toUpperCase();
    const apiFuncs = { daily: 'DIGITAL_CURRENCY_DAILY', weekly: 'DIGITAL_CURRENCY_WEEKLY', monthly: 'DIGITAL_CURRENCY_MONTHLY'};
    const apiFunc = apiFuncs[interval];
    if (apiFunc == undefined) {
        return AlphaVantage._rawSearchCrypto('CRYPTO_INTRADAY', symbol, interval, 'USD', attributes, dateFormat, startDate, endDate);
    }
    return AlphaVantage._rawSearchCrypto(apiFunc, symbol, null, 'USD', attributes, dateFormat, startDate, endDate);
};

AlphaVantage._rawSearchForex = async function(apifunction, fromSymbol, toSymbol, interval, attributes, dateFormat, startDate, endDate) {
    startDate = startDate ? +startDate : -Infinity;
    endDate = endDate ? +endDate : Infinity;

    let data, labelAppend;
    if (apifunction == 'FX_INTRADAY') {
        data = await this._requestData({path:'query', queryString:`function=${apifunction}&outputsize=full&from_symbol=${fromSymbol}&to_symbol=${toSymbol}&interval=${interval}min&apikey=${this.apiKey.value}`});
        labelAppend = `Time Series FX (${interval}min)`;
    }
    else if (apifunction == 'FX_DAILY') {
        data = await this._requestData({path:'query', queryString:`function=${apifunction}&outputsize=full&from_symbol=${fromSymbol}&to_symbol=${toSymbol}&apikey=${this.apiKey.value}`});
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

    if ('Error Message' in data) {
        throw new Error(`Unknown currency: ${fromSymbol} or ${toSymbol}`);
    }

    const matches = []; // Properties within the second property ("Time Series: (XX min)")

    // Fill time series with time tag and open/high/close
    for (const entry in data[labelAppend]) {
        const t = new Date(entry);
        const t_ms = +t;
        if (t_ms < startDate || t_ms > endDate) continue;

        const timeseries = [(dateFormat === 'fractional' ? parseFractionalYear(entry) : t).toString()];

        // Push the rest of the information
        const raw = data[labelAppend][entry];
        const cleaned = {
            'open': parseFloat(raw['1. open']),
            'high': parseFloat(raw['2. high']),
            'low': parseFloat(raw['3. low']),
            'close': parseFloat(raw['4. close']),
        };
        timeseries.push(attributes !== 'all' ? cleaned[attributes] : cleaned);

        matches.push(timeseries);
    }

    matches.reverse(); // make chronological
    return matches;
};

/**
 * Get time series data from the foreign exchange about the conversion rate between two types of currency.
 * To find currency symbol names, you can use :func:`AlphaVantage.currencySymbolSearch`.
 * @param {String} fromSymbol The cryptocurrency symbol to convert from.
 * @param {String} toSymbol The cryptocurrency symbol to convert to.
 * @param {TimePeriod} interval The interval of time series data to return.
 * @param {EquityField=} attributes A specific attribute/field of data to return for each entry, or ``all`` to return all entries (default: ``all``).
 * @param {DateFormat=} dateFormat The date format to return for each entry (default: ``traditional``).
 * @param {Date=} startDate The first date of results to include (defaults to no cutoff).
 * @param {Date=} endDate The last date of results to include (defaults to no cutoff).
 * @returns {Array<Tuple<Any, Any>>} Array of time series results, which are pairs of ``time`` and ``data``.
 */
AlphaVantage.getExchangeData = function(fromSymbol, toSymbol, interval, attributes = 'all', dateFormat = 'traditional', startDate, endDate) {
    fromSymbol = fromSymbol.toUpperCase();
    toSymbol = toSymbol.toUpperCase();
    const apiFuncs = { daily: 'FX_DAILY', weekly: 'FX_WEEKLY', monthly: 'FX_MONTHLY'};
    const apiFunc = apiFuncs[interval];
    if (apiFunc == undefined) {
        return AlphaVantage._rawSearchForex('FX_INTRADAY', fromSymbol, toSymbol, interval, attributes, dateFormat, startDate, endDate);
    }
    return AlphaVantage._rawSearchForex(apiFunc,fromSymbol, toSymbol, null, attributes, dateFormat, startDate, endDate);
};

/**
 * Convert an ``amount`` of currency of type ``fromSymbol`` into the (current) equivalent amount of currency of type ``toSymbol``.
 * To find currency symbol names, you can use :func:`AlphaVantage.currencySymbolSearch`.
 * @param {String} fromSymbol Currency type to convert from.
 * @param {Integer} amount Amount of currency to convert.
 * @param {String} toSymbol Currency type to convert to.
 * @returns {Number} The converted amount of currency.
 */
AlphaVantage.convertCurrency = async function(fromSymbol, amount, toSymbol) {
    fromSymbol = fromSymbol.toUpperCase();
    toSymbol = toSymbol.toUpperCase();
    const data = await this._requestData({path:'query', queryString:`function=CURRENCY_EXCHANGE_RATE&from_currency=${fromSymbol}&to_currency=${toSymbol}&apikey=${this.apiKey.value}`});
    if ('Error Message' in data) {
        throw new Error(`Unknown currencies: ${fromSymbol} or ${toSymbol}`);
    }
    const valueEntry = data['Realtime Currency Exchange Rate']['5. Exchange Rate'];
    return parseFloat(valueEntry) * amount;
};

/**
 * Search for a type of currency by name.
 * @param {BoundedString<2>} search String to search for matches.
 * @returns {Array<Tuple<String, String>>} List of search results, which are pairs of ``name`` and ``symbol``.
 */
AlphaVantage.currencySymbolSearch = function (search) {
    search = search.toLowerCase();

    const matches = [];
    for (const element of currencyTypes) {
        if ((element[0].toLowerCase()).includes(search)) {
            matches.push([element[0], element[1]]);
        }
    }
    return matches;
};

module.exports = AlphaVantage;

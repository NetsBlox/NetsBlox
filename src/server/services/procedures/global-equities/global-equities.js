/**
 * This API returns intraday time series of the equity specified, 
 * covering extended trading hours where applicable (e.g., 4:00am to 8:00pm Eastern Time for the US market). 
 * The intraday data is derived from the Securities Information Processor (SIP) market-aggregated data. 
 * Terms of use: https://www.alphavantage.co/terms_of_service/ 
 * @service
 */

 const ApiConsumer = require('../utils/api-consumer');
 const {GlobalEquitiesKey} = require('../utils/api-key');
 const baseUrl = 'https://alphavantage.co';
 const GlobalEquities = new ApiConsumer('GlobalEquities', baseUrl, {cache: {ttl: Infinity}});
 ApiConsumer.setRequiredApiKey(GlobalEquities, GlobalEquitiesKey);
 const types = require('../../input-types');
 
 types.defineType({
     name: 'EquitiesTimePeriod',
     description: 'The style to use for displaying :doc:`/services/PhoneIoT/index` slider, as created by :func:`PhoneIoT.addSlider`.',
     baseType: 'Enum',
     baseParams: { '5 min': 5, '10 min': 10, '15 min': 15, 'Daily':'daily','Weekly':'weekly','Monthly':'monthly'},
 });
 
 types.defineType({
     name: 'CryptoTimePeriod',
     description: 'The style to use for displaying :doc:`/services/PhoneIoT/index` slider, as created by :func:`PhoneIoT.addSlider`.',
     baseType: 'Enum',
     baseParams: { '1 min': 1, '5 min': 5, '15 min': 15, '30 min': 30,'60 min':60,'Daily':'daily','Weekly':'weekly','Monthly':'monthly'},
 });
 
 types.defineType({
     name: 'EquitiesCryptoAttributes',
     description: 'The style to use for displaying :doc:`/services/PhoneIoT/index` slider, as created by :func:`PhoneIoT.addSlider`.',
     baseType: 'Enum',
     baseParams: { 'All': 'all', 'Open': 'open', 'High': 'high', 'Low':'low', 'Close':'close', 'Volume':'volume'},
 });
 
 GlobalEquities._raw_search_equities = async function(apifunction, symbol, interval, attributes) {
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
     // Properties within the second property ("Time Series: (XX min)")
     const matches = [];
 
     // Print statements to verify read
     // console.log(Object.keys(data));
     // console.log(data[`${labelAppend}`]);
     
     // Fill time series with time tag and open/high/close
     for (const entry in data[`${labelAppend}`]) {
         const timeserie = [];
         yearString = entry.substr(0,entry.indexOf('-'));
         nextYearInt = parseInt(yearString) + 1;
         nextYearString = '' + nextYearInt;
         entryMillisec = new Date(entry) - new Date(yearString);
         entryYear = parseInt(yearString) + entryMillisec/(new Date(nextYearString) - new Date(yearString));
         // Push the key first (time)
         timeserie.push(entryYear);
         // Push the rest of the information
         const raw = data[`${labelAppend}`][entry];
         cleaned = {
             'open': parseFloat(raw['1. open']),
             'high': parseFloat(raw['2. high']),
             'low': parseFloat(raw['3. low']),
             'close': parseFloat(raw['4. close']),
             'volume': parseFloat(raw['5. volume'])
         };
         if (attributes !== 'all') {
             cleaned = cleaned[attributes];
         }
         timeserie.push(cleaned);
         console.log(timeserie);
         // Add to return array
         matches.push(timeserie);
     }
     return matches;
 };
 
 /**
  * Get data using either intraday, daily, weekly, or monthly API call
  * @param {String} symbol Ticker symbol
  * @param {EquitiesTimePeriod=} interval If intraday, 5, 10, or 15 minutes
  * @param {EquitiesCryptoAttributes=} attributes May be all or only 1
  * @return {Array} Array of time stamps and associated stock price
  */
 GlobalEquities.getEquityData = function(symbol = 'IBM', interval = 5, attributes = 'all') {
     const api_funcs = { daily: 'TIME_SERIES_DAILY', weekly: 'TIME_SERIES_WEEKLY', monthly: 'TIME_SERIES_MONTHLY'};
     const api_func = api_funcs[interval];
     if (api_func == undefined) {
         return GlobalEquities._raw_search_equities('TIME_SERIES_INTRADAY', symbol, interval, attributes);
     }
     return GlobalEquities._raw_search_equities(api_func,symbol, null, attributes);
 }
 
 GlobalEquities._raw_search_crypto = async function(apifunction, symbol, interval, market, attributes) {
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
     // Properties within the second property ("Time Series: (XX min)")
     const matches = [];
 
     // Print statements to verify read
     // console.log(Object.keys(data));
     // console.log(data[`${labelAppend}`]);
 
     // Fill time series with time tag and open/high/close
     for (const entry in data[`${labelAppend}`]) {
         const timeserie = [];
         yearString = entry.substr(0,entry.indexOf('-'));
         nextYearInt = parseInt(yearString) + 1;
         nextYearString = '' + nextYearInt;
         entryMillisec = new Date(entry) - new Date(yearString);
         entryYear = parseInt(yearString) + entryMillisec/(new Date(nextYearString) - new Date(yearString));
         // Push the key first (time)
         timeserie.push(entryYear);
         // Push the rest of the information
         const raw = data[`${labelAppend}`][entry];
         cleaned = {
             'open': parseFloat(raw['1. open']),
             'high': parseFloat(raw['2. high']),
             'low': parseFloat(raw['3. low']),
             'close': parseFloat(raw['4. close']),
             'volume': parseFloat(raw['5. volume'])
         };
         if (attributes !== 'all') {
             cleaned = cleaned[attributes];
         }
         timeserie.push(cleaned);
         console.log(timeserie);
         // Add to return array
         matches.push(timeserie);
     }
     return matches;
 }
 
 /**
  * @param {String} symbol Crypto symbol
  * @param {CryptoTimePeriod=} interval Interval selected by user
  * @param {EquitiesCryptoAttributes=} attributes May be all or only 1
  * @return {Array} Array of time stamps and associated stock price
 */
 GlobalEquities.getCryptoData = function(symbol = 'ETH', interval = 5, market = 'USD', attributes = 'all') {
     const api_funcs = { daily: 'DIGITAL_CURRENCY_DAILY', weekly: 'DIGITAL_CURRENCY_WEEKLY', monthly: 'DIGITAL_CURRENCY_MONTHLY'};
     const api_func = api_funcs[interval];
     if (api_func == undefined) {
         return GlobalEquities._raw_search_crypto('CRYPTO_INTRADAY', symbol, interval, market, attributes);
     }
     return GlobalEquities._raw_search_crypto(api_func,symbol, null, market, attributes);
 }
 
 module.exports = GlobalEquities;
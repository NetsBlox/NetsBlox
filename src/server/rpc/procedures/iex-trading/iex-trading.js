/**
 * The IEXTrading Service provides access to real-time and historical stock price data.
 * For more information, check out https://iextrading.com/developer.
 *
 * Terms of use: https://iextrading.com/api-exhibit-a
 * @service
 */

const ApiConsumer = require('../utils/api-consumer');
const StockConsumer = new ApiConsumer('iex-trading', 'https://api.iextrading.com/1.0',{cache: {ttl: 5*60}});

/**
 * Get the current price of the given stock, with a 15 min delay
 * @param {String} companySymbol Company stock ticker symbol
 * @returns {Number} Current price for the specified stock
 */
StockConsumer.currentPrice = function(companySymbol) {
    return this._sendAnswer({queryString: `/stock/${companySymbol}/quote?displayPercent=true`}, '.latestPrice');
};

/**
 * Get the last opening price of the specified company
 * @param {String} companySymbol Company stock ticker symbol
 * @returns {Number} Value of the last opening price for that stock
 */
StockConsumer.lastOpenPrice = function(companySymbol) {
    return this._sendAnswer({queryString: `/stock/${companySymbol}/quote?displayPercent=true`}, '.open');
};

/**
 * Get the last close price of the specified company
 * @param {String} companySymbol Company stock ticker symbol
 * @returns {Number} Value of the last close price for that stock
 */
StockConsumer.lastClosePrice = function(companySymbol) {
    return this._sendAnswer({queryString: `/stock/${companySymbol}/quote?displayPercent=true`}, '.close');
};

/**
 * Get all information about the specified company
 * @param {String} companySymbol Company stock ticker symbol
 * @returns {Object} Company information
 */
StockConsumer.companyInformation = function(companySymbol) {
    return this._sendAnswer({queryString: `/stock/${companySymbol}/quote?displayPercent=true`});
};

/**
* Get the daily change percent for a company
* @param {String} companySymbol Company stock ticker symbol
* @returns {Number} The daily change percent for the specified company
*/
StockConsumer.dailyPercentChange = function(companySymbol) {
    return this._sendAnswer({queryString: `/stock/${companySymbol}/quote?displayPercent=true`}, '.changePercent');
};

StockConsumer.serviceName = 'IEXTrading';

module.exports = StockConsumer;

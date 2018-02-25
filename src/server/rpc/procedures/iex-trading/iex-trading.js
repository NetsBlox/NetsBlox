// Data attributed to https://iextrading.com/api-exhibit-a

const ApiConsumer = require('../utils/api-consumer');


const StockConsumer = new ApiConsumer('iex-trading', 'https://api.iextrading.com/1.0',{cache: {ttl: 5*60}});

/**
 * Get the current price of the given stock, with a 15 min delay
 * @param {String} companySymbol Company stock ticker symbol
 * @returns {Number} Current price for the specified stock
 */
StockConsumer.currentPrice = function(companySymbol) {

	// Return statement, using a promise to allow _requestData to receive the value from the API before returning
    return this._requestData({queryString: `/stock/${companySymbol}/quote?displayPercent=true`})
        .then(body => {
            return body.latestPrice;
        });
};

/**
 * Get the last opening price of the specified company
 * @param {String} companySymbol Company stock ticker symbol
 * @returns {Number} Value of the last opening price for that stock
 */
StockConsumer.lastOpenPrice = function(companySymbol) {

	// Return statement, using a promise to allow _requestData to receive the value from the API before returning
    return this._requestData({queryString: `/stock/${companySymbol}/quote?displayPercent=true`})
        .then(body => {
            return body.open;
        });
};

/**
 * Get the last close price of the specified company
 * @param {String} companySymbol Company stock ticker symbol
 * @returns {Number} Value of the last close price for that stock
 */
StockConsumer.lastClosePrice = function(companySymbol) {

	// Return statement, using a promise to allow _requestData to receive the value from the API before returning
    return this._requestData({queryString: `/stock/${companySymbol}/quote?displayPercent=true`})
        .then(body => {
            return body.close;
        });
};

/**
 * Get all information about the specified company
 * @param {String} companySymbol Company stock ticker symbol
 * @returns {Object} Company information
 */
StockConsumer.companyInformation = function(companySymbol) {

	// Return statement, using a promise to allow _requestData to receive the value from the API before returning
    return this._requestData({queryString: `/stock/${companySymbol}/quote?displayPercent=true`})
        .then(body => {
            return body;
        });
};

/**
* Get the daily change percent for a company
* @param {String} companySymbol Company stock ticker symbol
* @returns {Number} The daily change percent for the specified company
*/
StockConsumer.dailyPercentChange = function(companySymbol) {

	// Return statement, using a promise to allow _requestData to receive the value from the API before returning
    return this._requestData({queryString: `/stock/${companySymbol}/quote?displayPercent=true`})
        .then(body => {
            return body.changePercent;
        });
};

StockConsumer.serviceName = 'IEXTrading';

module.exports = StockConsumer;

// Data attributed to https://iextrading.com/api-exhibit-a

const ApiConsumer = require('../utils/api-consumer');


let StockConsumer = new ApiConsumer('iex-trading', 'https://api.iextrading.com/1.0',{cache: {ttl: 3600*24*30*6}});

const queryOpts = {
    queryString: '/stock/',
    headers:{
    },
    body: undefined,
    cache: true
};

let stockParser = resp => {
    let results = [];
    results = resp[company];
	    
    return results;
};

/**
 * Get the selling price of the specified company, with a 15 min delay
 * @param {companySymbol} Symbol. The stock ticker symbol of the desired company
 * @returns {double} Value of the current price for that stock
 */
StockConsumer.currentPrice = function(companySymbol) {
	// Defines the query options for the API, including the user-defined value to receive
    queryOpts.queryString = '';
    queryOpts.queryString = '/stock/' + companySymbol + '/quote';

    let company = 'latestPrice';

	// Return statement, using a promise to allow _requestData to receive the value from the API before returning
    return this._requestData(queryOpts)
        .then(body => {
            return body[company];
        })
};

/**
 * Get the last opening price of the specified company
 * @param {companySymbol} Symbol. The stock ticker symbol of the desired company
 * @returns {double} Value of the last opening price for that stock
 */
StockConsumer.lastOpenPrice = function(companySymbol) {
	// Defines the query options for the API, including the user-defined value to receive

    queryOpts.queryString = '';
    queryOpts.queryString = '/stock/' + companySymbol + '/quote';

    company = 'open';

	// Return statement, using a promise to allow _requestData to receive the value from the API before returning
    return this._requestData(queryOpts)
        .then(body => {
            return body[company];
	    })
};

/**
 * Get the last close price of the specified company
 * @param {companySymbol} Symbol. The stock ticker symbol of the desired company
 * @returns {double} Value of the last close price for that stock
 */
StockConsumer.lastClosePrice = function(companySymbol) {
	// Defines the query options for the API, including the user-defined value to receive

    queryOpts.queryString = '';
    queryOpts.queryString = '/stock/' + companySymbol + '/quote';

    company = 'close';

	// Return statement, using a promise to allow _requestData to receive the value from the API before returning
    return this._requestData(queryOpts)
        .then(body => {
            return body[company];
        })
};

/**
 * Get a 2-n list of all the information about the specified company
 * @param {companySymbol} Symbol. The stock ticker symbol of the desired company
 * @returns {list} List of all the company information
 */
StockConsumer.companyInformation = function(companySymbol) {
	// Defines the query options for the API, including the user-defined value to receive

    queryOpts.queryString = '';
    queryOpts.queryString = '/stock/' + companySymbol + '/quote';

	// Return statement, using a promise to allow _requestData to receive the value from the API before returning
    return this._requestData(queryOpts, stockParser)
};

	/**
 	* Get the daily change percent for a company
 	* @param {companySymbol} Symbol. The stock ticker symbol of the desired company
 	* @returns {double} The daily change percent for the company
 	*/
StockConsumer.dailyPercentChange = function(companySymbol) {
	// Defines the query options for the API, including the user-defined value to receive

    queryOpts.queryString = '';
    queryOpts.queryString = '/stock/' + companySymbol + '/quote';

    company = 'changePercent';

	// Return statement, using a promise to allow _requestData to receive the value from the API before returning
    return this._requestData(queryOpts)
        .then(body => {
            return body[company];
        })
    };


module.exports = StockConsumer;

// Research Updates:

// current price
// daily change %
// last Open
// last close
// historical data (chart)
// catch-all that returns a 2 by n list
// - just return the JSON object they made it possible to display that

// RPC annotations

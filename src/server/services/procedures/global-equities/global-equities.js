/**
 * This API returns intraday time series of the equity specified, 
 * covering extended trading hours where applicable (e.g., 4:00am to 8:00pm Eastern Time for the US market). 
 * The intraday data is derived from the Securities Information Processor (SIP) market-aggregated data. 
 * Terms of use: https://www.alphavantage.co/terms_of_service/ 
 * @service
 */

const ApiConsumer = require('../utils/api-consumer');
const {GlobalEquitiesKey} = require('../utils/api-key');
const baseUrl = 'alphavantage.co';
const GlobalEquities = new ApiConsumer('GlobalEquities', baseUrl, {cache: {ttl: Infinity}});
ApiConsumer.setRequiredApiKey(GlobalEquities, GlobalEquitiesKey);

GlobalEquities._raw_search = async function(apifunction, symbol, interval) {
    const data = await this._requestData({path:'query?', queryString:`function=${apifunction}&symbol=${symbol}&interval=${interval}&apikey=${this.apiKey.value}`});
    const matches = [];
    for (const item of data.rows) {
        const metadata = [];
        if ('Meta Data' in item.context.freetext.matches) {
            for (const match of listify(item.content.freetext.matches)) {
                matches.push(match.content);
            }
        }
        const timeseries = [];
        if ('Time Series ' in item.context.freetext.matches) {
            for (const timeserie of listify(item.content.freetext.timeserise)) {
                timeseries.push(match.content);
            }
        }
    }
    const id = item.id;
    const title = item.title;
    matches.push({id, title, metadata, timeseries});
    return matches;
};

/**
 * Get data based on a specified ticker
 * @param {String} apifunction Function to utilize
 * @param {String} ticker Ticker symbol
 * @param {String} interval Time interval to retrieve data in minutes
 * Do I need a return here?
 */
GlobalEquities.search = function(apifunction = 'TIME_SERIES_INTRADAY', symbol, interval = '5min') {
    GlobalEquities._raw_search(apifunction, symbol, interval);
}
module.exports = GlobalEquities;

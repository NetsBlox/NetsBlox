/**
 * TODO
 * @service
 * @alpha
 */
const ApiConsumer = require('../utils/api-consumer');
const {NewYorkTimesKey} = require('../utils/api-key');
const baseUrl = 'https://api.nytimes.com/svc/';
const NewYorkTimes = new ApiConsumer('NewYorkTimes', baseUrl, {cache: {ttl: Infinity}});
ApiConsumer.setRequiredApiKey(NewYorkTimes, NewYorkTimesKey);

/**
 * Get the top stories for a given section
 *
 * @param{Section} section
 * @returns{Array<String>}
 */
NewYorkTimes.getTopStories = async function(section) {
    const response = await this._requestData({
        path: `topstories/v2/${section}.json`,
        queryString: `api-key=${this.apiKey.value}`,
    });
    return response.results;
};

/**
 * Get the top stories for a given section
 *
 * @param{Section} section
 * @returns{Array<String>}
 */
NewYorkTimes.getLatestArticles = function(source, section) {
    // TODO: https://developer.nytimes.com/docs/timeswire-product/1/overview
};

/**
 * Get the top stories for a given section
 *
 * @param{Section} section
 * @returns{Array<String>}
 */
NewYorkTimes.getLatestArticles = function(source, section) {
    // TODO: https://developer.nytimes.com/docs/timeswire-product/1/overview
};

module.exports = NewYorkTimes;

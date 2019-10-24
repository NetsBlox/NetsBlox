/** 
 * Uses ParallelDots AI to process or compare text for a variety of features.
 * See the API documentation, at 
 * http://apis.paralleldots.com/text_docs/index.html
 * 
 * Terms of use: https://www.paralleldots.com/terms-and-conditions
 * @service
 */

const ApiConsumer = require('../utils/api-consumer');
const DotsConsumer = new ApiConsumer('ParallelDots', 'https://apis.paralleldots.com/v4',{cache: {ttl: 5*60}});
const key = process.env.PARALLELDOTS_KEY;

const toLowerCaseKeys = object => {
    const result = {};
    // Correct inconsistencies in capitalization from ParallelDots
    Object.entries(object).forEach(entry => {
        const [key, value] = entry;
        result[key.toLowerCase()] = value;
    });
    return result;
};

DotsConsumer._parallelDotsRequest = function (query, text){
    let body = `api_key=${key}&text=${encodeURI(text)}`;
    return this._sendAnswer({
        queryString: query,
        method: 'POST',
        headers: {'Content-Type' : 'application/x-www-form-urlencoded'},
        body: body
    });
};

/**
 * @param {String} text
 */
DotsConsumer.sentiment = async function( text ) {
    const result = await this._parallelDotsRequest('/sentiment', text);
    return result.sentiment;
};

/**
 * @param {String} text1 Should be a long text (more than 2 words)
 * @param {String} text2 Should be a long text (more than 2 words)
 */
DotsConsumer.similarity = function( text1, text2 ) {
    let body = `api_key=${key}&text_1=${encodeURI(text1)}&text_2=${encodeURI(text2)}`;
    return this._sendAnswer({
        queryString: '/similarity', method: 'POST',
        headers: {'Content-Type' : 'application/x-www-form-urlencoded'},
        body: body
    });
};

/**
 * @param {String} text Long text to parse for Named Entities.
 */
DotsConsumer.ner = async function( text ) {
    const result = await this._parallelDotsRequest('/ner', text);
    return result.entities;
};

/**
 * @param {String} text Long text from which to extract keywords.
 */
DotsConsumer.keywords = async function( text ) {
    const result = await this._parallelDotsRequest('/keywords', text);
    return result.keywords;
};

/**
 * @param {String} text Long text to categorize into IAB categories.
 */
DotsConsumer.taxonomy = async function( text ) {
    const result = await this._parallelDotsRequest('/taxonomy', text);
    return result.taxonomy;
};

/**
 * @param {String} text  String to parse for emotional analysis
 */
DotsConsumer.emotion = async function( text ) {
    const result = await this._parallelDotsRequest('/emotion', text);
    return toLowerCaseKeys(result.emotion);
};

/**
 * @param {String} text String to parse for probability of sarcasm
 */
DotsConsumer.sarcasm = async function( text ) {
    const result = await this._parallelDotsRequest('/sarcasm', text);
    return toLowerCaseKeys(result);
};

/**
 * @param {String} text  String to parse for its intent
 */
DotsConsumer.intent = async function( text ) {
    const result = await this._parallelDotsRequest('/intent', text);
    return result.intent;
};

/**
 * @param {String} text  String to parse for possible abuse
 */
DotsConsumer.abuse = function( text ) {
    return this._parallelDotsRequest('/abuse', text);
};


DotsConsumer.isSupported = () => {
    if(!key){
        /* eslint-disable no-console*/
        console.error('PARALLELDOTS_KEY is missing.');
        /* eslint-enable no-console*/
    }
    return !!key;
};

module.exports = DotsConsumer;

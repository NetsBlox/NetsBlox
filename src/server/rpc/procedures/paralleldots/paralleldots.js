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

DotsConsumer._parallelDotsRequest = function (query, text){
    let body = `api_key=${key}&text=${encodeURI(text)}`;
    return this._sendAnswer({queryString: query, method: 'POST',
        headers: {
            'Content-Type' : 'application/x-www-form-urlencoded',}, body: body})
        .catch(err => {
            throw err;
        });
};

/**
 * @param {String} text
 */
DotsConsumer.sentiment = function( text ) {
    return this._parallelDotsRequest('/sentiment', text);
};

/**
 * @param {String} text1 Should be a long text (more than 2 words)
 * @param {String} text2 Should be a long text (more than 2 words)
 */
DotsConsumer.similarity = function( text1, text2 ) {
    let body = `api_key=${key}&text_1=${encodeURI(text1)}&text_2=${encodeURI(text2)}`;
    return this._sendAnswer({queryString: '/similarity', method: 'POST',
        headers: {
            'Content-Type' : 'application/x-www-form-urlencoded',}, body: body})
        .catch(err => {
            throw err;
        });
};

/**
 * @param {String} text Long text to parse for Named Entities.
 */
DotsConsumer.ner = function( text ) {
    return this._parallelDotsRequest('/ner', text);
};

/**
 * @param {String} text Long text from which to extract keywords.
 */
DotsConsumer.keywords = function( text ) {
    return this._parallelDotsRequest('/keywords', text);
};

/**
 * @param {String} text Long text to categorize into IAB categories.
 */
DotsConsumer.taxonomy = function( text ) {
    return this._parallelDotsRequest('/taxonomy', text);
};

/**
 * @param {String} text  String to parse for emotional analysis
 */
DotsConsumer.emotion = function( text ) {
    return this._parallelDotsRequest('/emotion', text);
};

/**
 * @param {String} text String to parse for probability of sarcasm
 */
DotsConsumer.sarcasm = function( text ) {
    return this._parallelDotsRequest('/sarcasm', text);
};

/**
 * @param {String} text  String to parse for its intent
 */
DotsConsumer.intent = function( text ) {
    return this._parallelDotsRequest('/intent', text);
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

/** 
 * Uses ParallelDots AI to process or compare text for a variety of features.
 * See the API documentation, at 
 * http://apis.paralleldots.com/text_docs/index.html
 * 
 * Terms of use: https://www.paralleldots.com/terms-and-conditions
 * @service
 * @category Language
 * @category ArtificialIntelligence
 */

const ApiConsumer = require('../utils/api-consumer');
const {ParallelDotsKey, InvalidKeyError} = require('../utils/api-key');
const ParallelDots = new ApiConsumer('ParallelDots', 'https://apis.paralleldots.com/v4',{cache: {ttl: 5*60}});
ApiConsumer.setRequiredApiKey(ParallelDots, ParallelDotsKey);

const toLowerCaseKeys = object => {
    const result = {};
    // Correct inconsistencies in capitalization from ParallelDots
    Object.entries(object).forEach(entry => {
        const [key, value] = entry;
        result[key.toLowerCase()] = value;
    });
    return result;
};

ParallelDots._parallelDotsRequest = async function(path, text){
    let body = `api_key=${this.apiKey.value}&text=${encodeURIComponent(text)}`;
    const response = await this._sendAnswer({
        path: path,
        method: 'POST',
        headers: {'Content-Type' : 'application/x-www-form-urlencoded'},
        body: body,
        cacheKey: {path, text}
    });
    if (response.code === 400) {
        throw new InvalidKeyError(this.apiKey);
    }
    return response;
};

/**
 * Find the overall sentiment of the given text along with the confidence score.
 * The returned structured data hasa confidence level for each of the following sentiment categories:
 * ``negative``, ``neutral``, and ``positive``.
 *
 * @param {String} text text to analyze
 * @returns {Object} structured data with confidence level for each category
 */
ParallelDots.getSentiment = async function(text) {
    const result = await this._parallelDotsRequest('/sentiment', text);
    return result.sentiment;
};

/**
 * Get the level of similarity between two snippets of text.
 * Note that the two pieces of text should be long, like full sentences (not just 2 words).
 * 
 * @param {String} text1 the first piece of text
 * @param {String} text2 a second piece of text
 * @returns {BoundedNumber<0,1>} the computed similarity level
 */
ParallelDots.getSimilarity = async function(text1, text2) {
    const body = `api_key=${this.apiKey.value}&text_1=${encodeURIComponent(text1)}&text_2=${encodeURIComponent(text2)}`;
    const result = await this._sendAnswer({
        path: '/similarity', method: 'POST',
        headers: {'Content-Type' : 'application/x-www-form-urlencoded'},
        body: body,
        cacheKey: {method: 'similarity', text1, text2}
    });
    return result.similarity_score;
};

/**
 * Identify named entities in the given text.
 *
 * @param {String} text text to analyze
 * @returns {Array} speculated information about named entities in the text, including the confidence level
 */
ParallelDots.getNamedEntities = async function(text) {
    const result = await this._parallelDotsRequest('/ner', text);
    return result.entities;
};

/**
 * Extract keywords from the given text along with their confidence score.
 *
 * @param {String} text text to analyze
 * @returns {Array} information about keywords in the text
 */
ParallelDots.getKeywords = async function(text) {
    const result = await this._parallelDotsRequest('/keywords', text);
    return result.keywords;
};

/**
 * Classify the given text into IAB categories.
 *
 * For more information about IAB categories, see
 * https://www.iab.com/guidelines/iab-quality-assurance-guidelines-qag-taxonomy/
 *
 * @param {String} text text to analyze
 * @returns {Array} information about the category breakdown, along with confidence scores
 */
ParallelDots.getTaxonomy = async function(text) {
    const result = await this._parallelDotsRequest('/taxonomy', text);
    return result.taxonomy;
};

/**
 * Find the emotion in the given text.
 * This is returned as structured data containing confidence levels for each of the following emotions:
 * ``excited``, ``angry``, ``bored``, ``fear``, ``sad``, and ``happy``.
 *
 * @param {String} text text to analyze
 * @returns {Object} structured data with confidence levels for each emotion
 */
ParallelDots.getEmotion = async function(text) {
    const result = await this._parallelDotsRequest('/emotion', text);
    return toLowerCaseKeys(result.emotion);
};

/**
 * Compute the probability of sarcasm for the given text.
 *
 * @param {String} text text to analyze
 * @returns {BoundedNumber<0,1>} predicted likelihood that the text is sarcastic
 */
ParallelDots.getSarcasmProbability = async function(text) {
    const result = await this._parallelDotsRequest('/sarcasm', text);
    return result.Sarcastic;
};

/**
 * Get the intent of the given text along with the confidence score.
 * This is returned as structured data with confidence levels for each of the following intents:
 * ``news``, ``query``, ``spam``, ``marketing``, and ``feedback``.
 *
 * @param {String} text text to analyze
 * @returns {Object} structured data with confidence levels for each intent
 */
ParallelDots.getIntent = async function(text) {
    const result = await this._parallelDotsRequest('/intent', text);
    return result.intent;
};

/**
 * Classify the given text as ``abusive``, ``hate_speech``, or ``neither``.
 * The returned structured data has confidence levels for each of these categories.
 * 
 * @param {String} text text to analyze
 * @returns {Object} structured data containing the confidence levels
 */
ParallelDots.getAbuse = function(text) {
    return this._parallelDotsRequest('/abuse', text);
};

module.exports = ParallelDots;

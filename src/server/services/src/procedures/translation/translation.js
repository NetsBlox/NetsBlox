/**
 * Uses Microsoft's Azure Cognitive Services API to translate text.
 * For more information, check out https://azure.microsoft.com/en-us/pricing/details/cognitive-services/translator-text-api/.
 *
 * Terms of use: https://www.microsoft.com/en-us/servicesagreement
 * @service
 * @category Language
 */

const {AzureTranslationKey} = require('../utils/api-key');
const ApiConsumer = require('../utils/api-consumer');
const TranslationConsumer = new ApiConsumer('Translation', 'https://api.cognitive.microsofttranslator.com/',{cache: {ttl: 12 * 60 * 60}});
ApiConsumer.setRequiredApiKey(TranslationConsumer, AzureTranslationKey);

/**
 * Generates a GUID-like string
 */
TranslationConsumer._get_guid = function () {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

/**
 * Translate text between languages
 * @param {String} text Text in another language
 * @param {String=} from Language to translate from (auto-detects if not specified)
 * @param {String} to Language to translate to
 * @returns {String} Text translated to requested language
 */
TranslationConsumer.translate = function(text, from, to) {
    let body = [{'Text' : text}];
    let guid = this._get_guid();
    let query = `?api-version=3.0&to=${to}`;

    if(from)
    {
        query = query + `&from=${from}`;
    }

    return this._sendAnswer({
        path: 'translate',
        queryString: query,
        method: 'POST',
        headers: {
            'Content-Type' : 'application/json',
            'Ocp-Apim-Subscription-Key' : this.apiKey.value,
            'X-ClientTraceId' : guid},
        body: body}, '.translations .text[0]')
        .catch(err => {
            throw err;
        });
};

/**
 * Translate text to English
 * @param {String} text Text in another language
 * @returns {String} Text translated to English
 */
TranslationConsumer.toEnglish = function(text) {
    return this.translate(text, null, 'en');
};

/**
 * Attempt to detect language of input text
 * @param {String} text Text in an unknown language
 * @returns {String} Abbreviation for name of language detected in text
 */
TranslationConsumer.detectLanguage = function(text) {
    let body = [{'Text' : text}];
    let guid = this._get_guid();
    return this._sendAnswer({
        path: 'detect',
        queryString: '?api-version=3.0',
        method: 'POST',
        headers: {
            'Content-Type' : 'application/json',
            'Ocp-Apim-Subscription-Key' : this.apiKey.value,
            'X-ClientTraceId' : guid},
        body: body}, '.language[0]')
        .catch(err => {
            throw err;
        });
};

/**
 * Attempt to detect language of input text
 * @returns {Array} List of languages supported by the translator
 */
TranslationConsumer.getSupportedLanguages = function() {
    return this._sendAnswer({
        path: 'languages',
        queryString: '?api-version=3.0&scope=translation',
        headers: {
            'Content-Type' : 'application/json',
            'Ocp-Apim-Subscription-Key' : this.apiKey.value}}, '.translation')
        .catch(err => {
            throw err;
        });
};

module.exports = TranslationConsumer;

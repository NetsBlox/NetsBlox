/**
 * Uses Microsoft's Azure Cognitive Services API to translate text.
 * For more information, check out https://azure.microsoft.com/en-us/pricing/details/cognitive-services/translator-text-api/.
 *
 * Terms of use: https://www.microsoft.com/en-us/servicesagreement
 * @service
 */

const ApiConsumer = require('../utils/api-consumer');
const TranslationConsumer = new ApiConsumer('azure-translation', 'https://api.cognitive.microsofttranslator.com/',{cache: {ttl: 15 * 60}});
const key = process.env.AZURE_TRANSLATION_KEY;

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
 * Translate text to English
 * @param {String} text Text in another language
 * @returns {String} Text translated to English
 */
TranslationConsumer.toEnglish = function(text) {
    let body = [{'Text' : text}];
    let guid = this._get_guid();
    return this._sendAnswer({queryString: `translate?api-version=3.0&to=en&h=${guid}`,
        method: 'POST',
        headers: { 'Content-Type' : 'application/json',
                    'Ocp-Apim-Subscription-Key' : key,
                    'X-ClientTraceId' : guid},
        body: body}, '.translations .text[0]')
        .catch(err => {
            throw err;
        });
};

/**
 * Attempt to detect language of input text
 * @param {String} text Text in an unknown language
 * @returns {String} Abbreviation for name of language detected in text
 */
TranslationConsumer.detectLanguage = function(text) {
    let body = [{'Text' : text}];
    let guid = this._get_guid();
    return this._sendAnswer({queryString: `detect?api-version=3.0&h=${guid}`,
        method: 'POST',
        headers: { 'Content-Type' : 'application/json',
                    'Ocp-Apim-Subscription-Key' : key,
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
    return this._sendAnswer({queryString: `languages?api-version=3.0&scope=translation`,
        headers: { 'Content-Type' : 'application/json',
                    'Ocp-Apim-Subscription-Key' : key}}, '.translation')
        .catch(err => {
            throw err;
        });
};

TranslationConsumer.isSupported = () => {
    if(!key){
        /* eslint-disable no-console*/
        console.error('AZURE_TRANSLATION_KEY is missing.');
        /* eslint-enable no-console*/
    }
    return !!key;
};

TranslationConsumer.serviceName = 'Translation';

module.exports = TranslationConsumer;

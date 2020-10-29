/**
 * Use CoreNLP to annotate text.
 *
 * For more information, check out https://stanfordnlp.github.io/CoreNLP/
 *
 * @service
 * @category Language
 */

const axios = require('axios');
const nlp = {};

/*
 * Get a list of all supported annotators.
 *
 * Complete list available at https://stanfordnlp.github.io/CoreNLP/annotators.html
 */
nlp.getAnnotators = function() {
    return [
        'tokenize',
        'cleanxml',
        'docdate',
        'ssplit',
        'pos',
        'lemma',
        'ner',
        'entitymentions',
        'regexner',
        'tokensregex',
        'parse',
        'depparse',
        'coref',
        'dcoref',
        'relation',
        'natlog',
        'openie',
        'entitylink',
        'kbp',
        'quote',
        'quote.attribution',
        'sentiment',
        'truecase',
        'udfeats',
    ];
};

/**
 * Annotate text using the provided annotators.
 *
 * @param{String} text
 * @param{Array<String>=} annotators
 */
nlp.annotate = async function(text, annotators=['tokenize', 'ssplit', 'pos']) {
    const qsData = JSON.stringify({
        annotators: annotators.join(','),
        outputFormat: 'json',
    });
    const url = `https://corenlp.run/?properties=${qsData}`;
    const response = await axios.post(url, text);
    return response.data;
};

nlp.serviceName = 'CoreNLP';
module.exports = nlp;

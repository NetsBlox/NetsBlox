/**
 * The CommonWords service provides access to common words in a variety of languages.
 * Words were discovered by retrieving the top 5000 words in each language
 *
 * @alpha
 * @service
 * @category Language
 */

const CommonWords = {};
const fs = require('fs');
const path = require('path');
const {SUPPORTED_LANGUAGES} = require('./types');
const words = Object.fromEntries(
    Object.values(SUPPORTED_LANGUAGES).map(lang => [lang, readWordList(lang)])
);

// Use Wordle dictionary for English words of length 5
const wordleAnswers = fs.readFileSync(path.join(__dirname, 'wordle', 'word-bank.csv')).toString().split('\n');
words['en'] = words['en'].filter(word => word.length != 5);
words['en'] = [...words['en'], ...wordleAnswers];


function readWordList(lang) {
    const filepath = path.join(__dirname, 'words', lang + '.txt');
    return fs.readFileSync(filepath, 'utf8')
        .split('\n').filter(line => !!line.trim());
}

/**
 * Get a list of supported languages.
 *
 * @return Array<SupportedLanguage>
 */
CommonWords.getLanguages = function() {
    return Object.keys(SUPPORTED_LANGUAGES);
};

/**
 * Get a (sub) list of common words in a given language.
 *
 * @param{SupportedLanguage} language
 * @param{BoundedInteger<1>=} start Index to start from (default 1)
 * @param{BoundedInteger<1>=} end Index of last word to include (default 10)
 */
CommonWords.getWords = function (language, start = 1, end = 10) {
    return words[language].slice(start-1, end);
};

module.exports = CommonWords;

const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    utils.verifyRPCInterfaces('Translation', [
        ['translate', ['text', 'from', 'to']],
        ['toEnglish', ['text']],
        ['detectLanguage', ['text']],
        ['getSupportedLanguages', []],
    ]);
});

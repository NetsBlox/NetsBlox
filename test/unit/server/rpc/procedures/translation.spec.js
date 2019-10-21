describe('translation', function() {
    const utils = require('../../../../assets/utils');

    utils.verifyRPCInterfaces('Translation', [
        ['translate', ['text', 'from', 'to']],
        ['toEnglish', ['text']],
        ['detectLanguage', ['text']],
        ['getSupportedLanguages', []],
    ]);
});

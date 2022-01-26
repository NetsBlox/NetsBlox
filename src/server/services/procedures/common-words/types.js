const types = require('../../input-types');
const SUPPORTED_LANGUAGES = {
    English: 'en',
    Español: 'es',
    //Magyar: 'hu',
};

types.defineType({
    name: 'SupportedLanguage',
    description: 'A language supported by the :doc:`/services/CommonWords/index` service.',
    baseType: 'Enum',
    baseParams: SUPPORTED_LANGUAGES,
});

module.exports = {SUPPORTED_LANGUAGES};

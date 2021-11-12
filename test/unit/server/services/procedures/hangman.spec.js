const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    utils.verifyRPCInterfaces('Hangman', [
        ['guess', ['letter']],
        ['setWord',['word']],
        ['getWrongCount', []],
        ['getCurrentlyKnownWord',[]],
        ['isWordGuessed', []]
    ]);
});

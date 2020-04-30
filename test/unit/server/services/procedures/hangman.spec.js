describe('hangman', function() {
    const utils = require('../../../../assets/utils');
    var Hangman = utils.reqSrc('services/procedures/hangman/hangman'),
        RPCMock = require('../../../../assets/mock-service'),
        hangman = new RPCMock(Hangman);

    utils.verifyRPCInterfaces('Hangman', [
        ['guess', ['letter']],
        ['setWord',['word']],
        ['getWrongCount', []],
        ['getCurrentlyKnownWord',[]],
        ['isWordGuessed', []]
    ]);
});

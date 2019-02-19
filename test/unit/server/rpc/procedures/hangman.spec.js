describe('hangman', function() {
    const utils = require('../../../../assets/utils');
    var Hangman = utils.reqSrc('rpc/procedures/hangman/hangman'),
        RPCMock = require('../../../../assets/mock-rpc'),
        hangman = new RPCMock(Hangman);

    utils.verifyRPCInterfaces(hangman, [
        ['guess', ['letter']],
        ['setWord',['word']],
        ['getWrongCount', []],
        ['getCurrentlyKnownWord',[]],
        ['isWordGuessed', []]
    ]);
});

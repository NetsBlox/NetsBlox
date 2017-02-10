describe('hangman', function() {
    var Hangman = require('../../../../src/server/rpc/procedures/hangman/hangman'),
        RPCMock = require('../../../assets/mock-rpc'),
        utils = require('../../../assets/utils'),
        hangman = new RPCMock(Hangman);

    utils.verifyRPCInterfaces(hangman, [
        ['guess', ['letter']],
        ['setWord',['word']],
        ['getWrongCount', []],
        ['getCurrentlyKnownWord',[]],
        ['isWordGuessed', []]
    ]);
});

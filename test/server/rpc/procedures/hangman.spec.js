describe('hangman', function() {
    var Hangman = require('../../../../src/server/rpc/procedures/Hangman/Hangman'),
        RPCMock = require('../../../assets/MockRPC'),
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

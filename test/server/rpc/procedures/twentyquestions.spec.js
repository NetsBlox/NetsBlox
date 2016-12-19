describe('twentyquestions', function() {
    var TwentyQuestions = require('../../../../src/server/rpc/procedures/Twenty Questions/Twenty Questions'),
        RPCMock = require('../../../assets/MockRPC'),
        utils = require('../../../assets/utils'),
        twentyquestions = new RPCMock(TwentyQuestions);

    utils.verifyRPCInterfaces(twentyquestions, [
        ['start', ['answer']],
        ['guess', ['guess']],
        ['answer', ['answer']],
        ['gameStarted'],
        ['restart']
    ]);
});

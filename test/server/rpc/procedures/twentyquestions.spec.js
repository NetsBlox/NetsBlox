describe('twentyquestions', function() {
    var TwentyQuestions = require('../../../../src/server/rpc/procedures/twenty-questions/twenty-questions'),
        RPCMock = require('../../../assets/mock-rpc'),
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

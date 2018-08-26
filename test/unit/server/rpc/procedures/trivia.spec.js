describe('trivia', function() {
    const utils = require('../../../../assets/utils');
    var Trivia = utils.reqSrc('rpc/procedures/trivia/trivia'),
        RPCMock = require('../../../../assets/mock-rpc'),
        trivia = new RPCMock(Trivia);

    utils.verifyRPCInterfaces(trivia, [
        ['random'],
        ['getRandomQuestion']
    ]);
});

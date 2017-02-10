describe('trivia', function() {
    var Trivia = require('../../../../src/server/rpc/procedures/trivia/trivia'),
        RPCMock = require('../../../assets/mock-rpc'),
        utils = require('../../../assets/utils'),
        trivia = new RPCMock(Trivia);

    utils.verifyRPCInterfaces(trivia, [
        ['random']
    ]);
});

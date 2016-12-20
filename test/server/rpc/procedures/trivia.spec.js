describe('trivia', function() {
    var Trivia = require('../../../../src/server/rpc/procedures/Trivia/Trivia'),
        RPCMock = require('../../../assets/MockRPC'),
        utils = require('../../../assets/utils'),
        trivia = new RPCMock(Trivia);

    utils.verifyRPCInterfaces(trivia, [
        ['random']
    ]);
});

describe('nplayer', function() {
    var NPlayer = require('../../../../src/server/rpc/procedures/n-player/n-player'),
        RPCMock = require('../../../assets/mock-rpc'),
        utils = require('../../../assets/utils'),
        nplayer = new RPCMock(NPlayer);

    utils.verifyRPCInterfaces(nplayer, [
        ['start'],
        ['getN'],
        ['getActive'],
        ['getPrevious'],
        ['getNext'],
        ['endTurn', ['next']]
    ]);
});

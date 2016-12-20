describe('nplayer', function() {
    var NPlayer = require('../../../../src/server/rpc/procedures/NPlayer/NPlayer'),
        RPCMock = require('../../../assets/MockRPC'),
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

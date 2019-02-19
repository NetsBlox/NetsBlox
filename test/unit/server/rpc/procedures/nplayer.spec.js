describe('nplayer', function() {
    const utils = require('../../../../assets/utils');
    var NPlayer = utils.reqSrc('rpc/procedures/n-player/n-player'),
        RPCMock = require('../../../../assets/mock-rpc'),
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

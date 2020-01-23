describe('nplayer', function() {
    const utils = require('../../../../assets/utils');

    utils.verifyRPCInterfaces('NPlayer', [
        ['start'],
        ['getN'],
        ['getActive'],
        ['getPrevious'],
        ['getNext'],
        ['endTurn', ['next']]
    ]);
});

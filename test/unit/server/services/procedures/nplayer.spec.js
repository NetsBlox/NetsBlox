const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    utils.verifyRPCInterfaces('NPlayer', [
        ['start'],
        ['getN'],
        ['getActive'],
        ['getPrevious'],
        ['getNext'],
        ['endTurn', ['next']]
    ]);
});

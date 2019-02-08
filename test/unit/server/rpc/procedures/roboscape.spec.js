describe('roboscape', function () {
    const utils = require('../../../../assets/utils'),
        ROBOSCAPE_MODE = process.env.ROBOSCAPE_MODE || 'both';

    var RoboScape = utils.reqSrc('rpc/procedures/roboscape/roboscape'),
        RPCMock = require('../../../../assets/mock-rpc'),
        roboscape = new RPCMock(RoboScape);


    if (ROBOSCAPE_MODE === 'native' || ROBOSCAPE_MODE === 'both') {
        utils.verifyRPCInterfaces(roboscape, [
            ['isAlive', ['robot']],
            ['setSpeed', ['robot', 'left', 'right']],
            ['setLed', ['robot', 'led', 'command']],
            ['beep', ['robot', 'msec', 'tone']],
            ['infraLight', ['robot', 'msec', 'pwr']],
            ['getRange', ['robot']],
            ['getTicks', ['robot']],
            ['drive', ['robot', 'left', 'right']],
            ['setTotalRate', ['robot', 'rate']],
            ['setClientRate', ['robot', 'rate', 'penalty']],
        ], 'roboscape native');
    }

    if (ROBOSCAPE_MODE === 'security' || ROBOSCAPE_MODE === 'both') {
        utils.verifyRPCInterfaces(roboscape, [
            ['send', ['robot', 'command']],
        ], 'roboscape security');
    }
});

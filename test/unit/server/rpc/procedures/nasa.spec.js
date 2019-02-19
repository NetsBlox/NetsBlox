describe('nasa', function() {
    const utils = require('../../../../assets/utils');
    var NASA = utils.reqSrc('rpc/procedures/nasa/nasa'),
        RPCMock = require('../../../../assets/mock-rpc'),
        nasa = new RPCMock(NASA);

    utils.verifyRPCInterfaces(nasa, [
        ['apod'],
        ['apodMedia'],
        ['marsHighTemp'],
        ['marsLowTemp'],
        ['marsWeather']
    ]);
});

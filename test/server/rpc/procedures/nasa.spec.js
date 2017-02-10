describe('nasa', function() {
    var NASA = require('../../../../src/server/rpc/procedures/nasa/nasa'),
        RPCMock = require('../../../assets/mock-rpc'),
        utils = require('../../../assets/utils'),
        nasa = new RPCMock(NASA);

    utils.verifyRPCInterfaces(nasa, [
        ['apod'],
        ['apodMedia'],
        ['marsHighTemp'],
        ['marsLowTemp'],
        ['marsWeather']
    ]);
});

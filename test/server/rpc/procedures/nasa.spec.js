describe('nasa', function() {
    var NASA = require('../../../../src/server/rpc/procedures/NASA/NASA'),
        RPCMock = require('../../../assets/MockRPC'),
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

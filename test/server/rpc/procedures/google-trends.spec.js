describe('google-trends', function() {
    var GTrends = require('../../../../src/server/rpc/procedures/google-trends/google-trends'),
        RPCMock = require('../../../assets/mock-rpc'),
        utils = require('../../../assets/utils'),
        gTrends = new RPCMock(GTrends);

    utils.verifyRPCInterfaces(gTrends, [
        ['byLocation', ['latitude', 'longitude']],
        ['byCountryCode', ['countryCode']]
    ]);
});

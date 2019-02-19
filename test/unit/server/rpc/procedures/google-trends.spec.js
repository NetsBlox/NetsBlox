describe('google-trends', function() {
    const utils = require('../../../../assets/utils');
    var GTrends = utils.reqSrc('rpc/procedures/google-trends/google-trends'),
        RPCMock = require('../../../../assets/mock-rpc'),
        gTrends = new RPCMock(GTrends);

    utils.verifyRPCInterfaces(gTrends, [
        ['byLocation', ['latitude', 'longitude']],
        ['byCountryCode', ['countryCode']]
    ]);
});

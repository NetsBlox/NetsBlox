describe('google-streetview', function() {
    const utils = require('../../../../assets/utils');
    var StreetViewService = utils.reqSrc('rpc/procedures/google-streetview/google-streetview'),
        RPCMock = require('../../../../assets/mock-rpc'),
        stocks = new RPCMock(StreetViewService);

    utils.verifyRPCInterfaces(stocks, [
        ['getViewFromLatLong', ['latitude', 'longitude', 'width', 'height', 'fieldofview', 'heading', 'pitch']],
        ['getViewFromAddress', ['location', 'width', 'height', 'fieldofview', 'heading', 'pitch']],
    ]);
});

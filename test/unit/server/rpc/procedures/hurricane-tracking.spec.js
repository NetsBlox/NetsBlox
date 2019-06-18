describe('hurricane-tracking', function() {
    const utils = require('../../../../assets/utils');
    var HurricaneInfo = utils.reqSrc('rpc/procedures/hurricane-tracking/hurricane-tracking'),
        RPCMock = require('../../../../assets/mock-rpc'),
        hurricaneTracking = new RPCMock(HurricaneInfo);

    utils.verifyRPCInterfaces(hurricaneTracking, [
        ['getFullTable', []],
        ['getHurricane', ['name', 'year']],
        ['getNamesForYear', ['year']],
        ['getLatitude', ['name', 'year']],
        ['getLongitude', ['name', 'year']],
    ]);
});
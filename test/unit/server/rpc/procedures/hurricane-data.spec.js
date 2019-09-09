describe.only('hurricane-tracking', function() {
    const utils = require('../../../../assets/utils');
    const HurricaneData = utils.reqSrc('rpc/procedures/hurricane-data/hurricane-data'),
        RPCMock = require('../../../../assets/mock-rpc'),
        hurricaneData = new RPCMock(HurricaneData);

    utils.verifyRPCInterfaces(hurricaneData, [
        ['getHurricaneData', ['name', 'year']],
        ['getHurricanesInYear', ['year']],
        ['getYearsWithHurricaneNamed', ['name']],
    ]);
});

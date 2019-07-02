describe('hawaii-co2-data', function() {
    const utils = require('../../../../assets/utils');
    var HawaiiCO2Service = utils.reqSrc('rpc/procedures/hawaii-co2-data/hawaii-co2-data'),
        RPCMock = require('../../../../assets/mock-rpc'),
        co2 = new RPCMock(HawaiiCO2Service);

    utils.verifyRPCInterfaces(co2, [
        ['getInterpolated', []],
        ['getSeasonal', []],
        ['getWhole', []],
        ['getPPM', ['year', 'month', 'type']],
    ]);
});
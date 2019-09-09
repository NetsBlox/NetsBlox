describe('ocean-data', function() {
    const utils = require('../../../../assets/utils');
    var OceanData = utils.reqSrc('rpc/procedures/ocean-data/ocean-data'),
        RPCMock = require('../../../../assets/mock-rpc'),
        oceanData = new RPCMock(OceanData);

    utils.verifyRPCInterfaces(oceanData, [
        ['getOxygenRatio', []],
        ['getDeepOceanTemp', []],
        ['getSurfaceTemp', []],
        ['getSeaLevel', []],
    ]);
});

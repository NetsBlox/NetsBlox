describe('sea-surface', function() {
    const utils = require('../../../../assets/utils');
    var OceanData = utils.reqSrc('rpc/procedures/sea-surface/sea-surface'),
        RPCMock = require('../../../../assets/mock-rpc'),
        seaSurface = new RPCMock(OceanData);

    utils.verifyRPCInterfaces(seaSurface, [
        ['getFullTable', []],
        ['getOxygenRatio', []],
        ['getDeepOceanTemp', []],
        ['getSurfaceTemp', []],
        ['getSeaLevel', []],
    ]);
});
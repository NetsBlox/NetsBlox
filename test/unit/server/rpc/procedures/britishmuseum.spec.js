describe('british museum rpc', function() {
    const utils = require('../../../../assets/utils');
    const BritishM = utils.reqSrc('rpc/procedures/british-museum/british-museum'),
        RPCMock = require('../../../../assets/mock-rpc'),
        bMuseum = new RPCMock(BritishM);

    utils.verifyRPCInterfaces(bMuseum, [
        ['searchByLabel', ['label', 'limit']],
        ['searchByType', ['type', 'limit']],
        ['searchByMaterial', ['material', 'limit']],
        ['itemDetails', ['itemId']],
        ['getImage', ['imageId', 'maxWidth', 'maxHeight']],
    ]);
});

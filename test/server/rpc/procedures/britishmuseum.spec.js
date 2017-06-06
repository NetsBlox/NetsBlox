describe('british museum rpc', function() {
    const BritishM = require('../../../../src/server/rpc/procedures/british-museum/british-museum'),
        RPCMock = require('../../../assets/mock-rpc'),
        utils = require('../../../assets/utils'),
        bMuseum = new RPCMock(BritishM);

    utils.verifyRPCInterfaces(bMuseum, [
        ['searchByLabel', ['label', 'limit']],
        ['searchByType', ['type', 'limit']],
        ['searchByMaterial', ['material', 'limit']],
        ['itemDetails', ['itemId']],
        ['getImage', ['imageId', 'maxWidth', 'maxHeight']],
    ]);
});

describe('british museum rpc', function() {
    const utils = require('../../../../assets/utils');

    utils.verifyRPCInterfaces('BritishMuseum', [
        ['searchByLabel', ['label', 'limit']],
        ['searchByType', ['type', 'limit']],
        ['searchByMaterial', ['material', 'limit']],
        ['itemDetails', ['itemId']],
        ['getImage', ['imageId', 'maxWidth', 'maxHeight']],
    ]);
});

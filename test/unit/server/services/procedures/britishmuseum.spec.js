const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    utils.verifyRPCInterfaces('BritishMuseum', [
        ['searchByLabel', ['label', 'limit']],
        ['searchByType', ['type', 'limit']],
        ['searchByMaterial', ['material', 'limit']],
        ['itemDetails', ['itemId']],
        ['getImage', ['imageId', 'maxWidth', 'maxHeight']],
    ]);
});

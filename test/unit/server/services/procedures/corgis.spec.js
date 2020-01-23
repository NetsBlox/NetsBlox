describe('met-museum', function() {
    const utils = require('../../../../assets/utils');

    utils.verifyRPCInterfaces('Corgis', [
        ['searchDataset', ['name', 'query', 'limit']],
        ['availableDatasets', []],
    ]);
});

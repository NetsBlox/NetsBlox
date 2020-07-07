describe('corgis', function() {
    const utils = require('../../../../assets/utils');
    const corgis = utils.reqSrc('services/procedures/corgis/corgis');
    const datasetRPCs = corgis.allDatasets().map(ds => [ds.id, ['query', 'limit']]);

    utils.verifyRPCInterfaces('Corgis', [
        ['searchDataset', ['name', 'query', 'limit']],
        ['availableDatasets', []],
        ['allDatasets'],
        ...datasetRPCs
    ]);
});

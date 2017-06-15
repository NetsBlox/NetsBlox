/**
 * Created by admin on 6/15/17.
 */
describe('corgis', function() {
    var Dataset = require('../../../../src/server/rpc/procedures/datasets/datasets'),
        RPCMock = require('../../../assets/mock-rpc'),
        utils = require('../../../assets/utils'),
        dataset = new RPCMock(Dataset);
    
    utils.verifyRPCInterfaces(dataset, [
        ['searchDataset', ['name', 'query']],
        ['datasetsNames']
    ]);
});
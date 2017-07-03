describe('chart', function() {
    var Chart = require('../../../../src/server/rpc/procedures/chart/chart.js'),
        RPCMock = require('../../../assets/mock-rpc'),
        chart = new RPCMock(Chart),
        utils = require('../../../assets/utils');
    
    utils.verifyRPCInterfaces(chart,[
        ['drawBarChart', ['dataset', 'numDataset', 'xAxisTag', 'yAxisTag','datasetTag', 'title']],
        ['drawLineChart', ['dataset', 'numDataset', 'xAxisTag', 'yAxisTag','datasetTag', 'title']]
    ]);
});
describe('chart', function() {
    var Chart = require('../../../../src/server/rpc/procedures/chart/chart.js'),
        RPCMock = require('../../../assets/mock-rpc'),
        chart = new RPCMock(Chart),
        utils = require('../../../assets/utils');
    
    utils.verifyRPCInterfaces(chart,[
        ['drawBarChart', ['dataset', 'numDataset', 'xAxisTag', 'yAxisTag','datasetTag', 'title']],
        ['drawLineChart', ['dataset', 'numDataset', 'xAxisTag', 'yAxisTag','datasetTag', 'title']]
    ]);
    
    describe('shit', function() {
        it('shit', function() {
            var test = [[['name', 'ellie'], ['age', '15']]];
            console.log('a');
            console.log(chart.drawBarChart(test, -1, 'name', 'age', 'shit'));
        });
    });
});
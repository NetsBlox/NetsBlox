describe('chart', function() {
    var Chart = require('../../../../src/server/rpc/procedures/chart/chart.js'),
        RPCMock = require('../../../assets/mock-rpc'),
        chart = new RPCMock(Chart),
        utils = require('../../../assets/utils'),
        assert = require('assert');
    
    utils.verifyRPCInterfaces(chart,[
        ['drawBarChart', ['dataset', 'numDataset', 'xAxisTag', 'yAxisTag','datasetTag', 'title']],
        ['drawLineChart', ['dataset', 'numDataset', 'xAxisTag', 'yAxisTag','datasetTag', 'title']]
    ]);
    
    beforeEach(function() {
        dataset1 = [[['name', 'ellie'], ['age', 15]]];
        supposedData = {
            labels: ['ellie'],
            datasets: [{
                label: 'Age',
                data: [ 15 ],
                backgroundColor: 'rgba(74, 108, 212, 0.8)',
                borderColor: 'rgba(74, 108, 212, 0.8)'
            }]
        };
    });
    
    describe('test secret methods', function() {
        it('test process dataset', function() {
            assert.deepEqual(chart._rpc._processDataset(dataset1, 'age', 'Age', 0, 'bar'), supposedData.datasets[0]);
            supposedData.datasets[0].fill = false;
            assert.deepEqual(chart._rpc._processDataset(dataset1, 'age', 'Age', 0, 'line'), supposedData.datasets[0]);
        });
        
        it('test process data', function() {
            assert.deepEqual(chart._rpc._processData(dataset1, 1,  'Age', 'bar'), supposedData);
        });
    });
});
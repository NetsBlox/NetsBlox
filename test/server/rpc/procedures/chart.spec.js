describe('chart', function() {
    var Chart = require('../../../../src/server/rpc/procedures/chart/chart.js'),
        RPCMock = require('../../../assets/mock-rpc'),
        chart = new RPCMock(Chart),
        utils = require('../../../assets/utils'),
        assert = require('assert');
    
    utils.verifyRPCInterfaces(chart,[
        ['drawBarChart', ['dataset', 'xAxisTag', 'yAxisTag','datasetTag', 'title']],
        ['drawLineChart', ['dataset', 'xAxisTag', 'yAxisTag','datasetTag', 'title']]
    ]);
    
    beforeEach(function() {
        dataset1 = [[['name', 'ellie'], ['age', 15]]];
        supposedData1 = {
            labels: ['ellie'],
            datasets: [{
                label: 'Age',
                data: [ 15 ],
                backgroundColor: 'rgba(74, 108, 212, 0.8)',
                borderColor: 'rgba(74, 108, 212, 0.8)'
            }]
        };
        dataset2 = [dataset1, dataset1];
        supposedData2 = {
            labels: ['ellie'],
            datasets: [
                {
                    label: '1',
                    data: [ 15 ],
                    backgroundColor: 'rgba(74, 108, 212, 0.8)',
                    borderColor: 'rgba(74, 108, 212, 0.8)'
                },
                {
                    label: '2',
                    data: [ 15 ],
                    backgroundColor: 'rgba(217, 77, 17, 0.8)',
                    borderColor: 'rgba(217, 77, 17, 0.8)'
                }
            ]
        };
    });
    
    describe('test secret methods', function() {
        it('test process dataset', function() {
            assert.deepEqual(chart._rpc._processDataset(dataset1, 'age', 'Age', 0, 'bar'), supposedData1.datasets[0]);
            supposedData1.datasets[0].fill = false;
            assert.deepEqual(chart._rpc._processDataset(dataset1, 'age', 'Age', 0, 'line'), supposedData1.datasets[0]);
        });
        
        it('test process one dataset', function() {
            assert.deepEqual(chart._rpc._processData(dataset1,  'Age', 'bar'), supposedData1);
        });
    
        it('test process multiple datasets', function() {
            assert.deepEqual(chart._rpc._processMultipleData(dataset2,  ['1', '2'], 'bar'), supposedData2);
        });
    });
});

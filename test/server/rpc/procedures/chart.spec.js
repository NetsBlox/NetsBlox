describe('chart', function() {
    var Chart = require('../../../../src/server/rpc/procedures/chart/chart.js'),
        RPCMock = require('../../../assets/mock-rpc'),
        chart = new RPCMock(Chart),
        utils = require('../../../assets/utils'),
        assert = require('assert');
    
    utils.verifyRPCInterfaces(chart,[
        ['draw', ['lines', 'options']],
        ['defaultOptions', []],
        ['drawBarChart', ['dataset', 'xAxisTag', 'yAxisTag','datasetTag', 'title']],
        ['drawLineChart', ['dataset', 'xAxisTag', 'yAxisTag','datasetTag', 'title']]

    ]);

    it('should have stable options objects', function(){
        const opts = chart.defaultOptions();
        const expectedOpts = [
            'title',
            'labels',
            'types',
            'xRange',
            'yRange',
            'xLabel',
            'yLabel',
            'xTicks',
            'smooth',
            'grid',
            'isTimeSeries',
            'timeInputFormat',
            'timeDisplayFormat'
        ];
        assert.deepEqual(opts.map(i => i[0]), expectedOpts);
    });

});

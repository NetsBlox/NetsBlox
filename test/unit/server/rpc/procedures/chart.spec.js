describe('chart', function() {
    const utils = require('../../../../assets/utils');
    var Chart = utils.reqSrc('rpc/procedures/chart/chart.js'),
        RPCMock = require('../../../../assets/mock-rpc'),
        chart = new RPCMock(Chart),
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
            'isCategorical',
            'smooth',
            'grid',
            'isTimeSeries',
            'timeInputFormat',
            'timeDisplayFormat'
        ];
        assert.deepEqual(opts.map(i => i[0]), expectedOpts);
    });

});

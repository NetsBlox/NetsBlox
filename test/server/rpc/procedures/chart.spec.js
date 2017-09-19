describe('chart', function() {
    var Chart = require('../../../../src/server/rpc/procedures/chart/chart.js'),
        RPCMock = require('../../../assets/mock-rpc'),
        chart = new RPCMock(Chart),
        utils = require('../../../assets/utils'),
        assert = require('assert');
    
    utils.verifyRPCInterfaces(chart,[
        ['draw', ['lines', 'options']],
        ['defaultOptions', []]
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
            'timeSeriesAxis',
            'timeInputFormat',
            'timeOutputFormat'
        ];
        assert.deepEqual(opts.map(i => i[0]), expectedOpts);
    });

});

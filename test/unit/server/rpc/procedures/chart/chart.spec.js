describe('chart', function() {
    const utils = require('../../../../../assets/utils');
    var Chart = utils.reqSrc('rpc/procedures/chart/chart.js'),
        RPCMock = require('../../../../../assets/mock-rpc'),
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

    // test various options...
    it.skip('should support xTicks with time series data', function(){
        const opts = {
            isTimeSeries: true,
            xTicks: 7
        };

        const lines = [
            [1502729400, 73.58],
            [1502729700, 73.60],
            [1502730000, 73.60],
            [1502730300, 73.60],
            [1502730600, 73.60],
            [1502731200, 73.60],
            [1502731500, 72.25],
            [1502731800, 73.60],
            [1502732100, 73.60],
            [1502732400, 70],
            [1502732700, 73.60],
            [1502733000, 71],
        ];
        return chart.draw(lines, opts)
            .then(() => {
                const fs = require('fs');
                const path = require('path');

                const img = chart.response.response;
                const expected = fs.readFileSync(path.join(__dirname, 'xTicks-isTimeSeries.png'));
                assert(expected.equals(img));
            });
    });
});

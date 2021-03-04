const utils = require('../../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    var Chart = utils.reqSrc('services/procedures/chart/chart.js'),
        RPCMock = require('../../../../../assets/mock-service'),
        chart = new RPCMock(Chart),
        assert = require('assert');

    utils.verifyRPCInterfaces('Chart',[
        ['draw', ['lines', 'options']],
        ['defaultOptions', []],
        ['drawBarChart', ['dataset', 'xAxisTag', 'yAxisTag','datasetTag', 'title']],
        ['drawLineChart', ['dataset', 'xAxisTag', 'yAxisTag','datasetTag', 'title']]

    ]);

    it('should have stable options objects', function(){
        const opts = chart.defaultOptions();
        const expectedOpts = [
            'title',
            'width',
            'height',
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
            'timeDisplayFormat',
            'logscale',
        ];
        assert.deepEqual(opts.map(i => i[0]), expectedOpts);
    });

    describe('parseDrawInputs', function() {
        it('should support implicit x-values', function() {
            const inputLine = [[2, 3, 4, 5, 6]];
            const [lineData] = Chart._prepareData(inputLine);
            lineData.forEach(pair => {
                const [x, y] = pair;
                assert.equal(x + 1, y);
            });
        });

        it('should support single line input', function() {
            const inputLine = [2, 3, 4, 5, 6];
            const [lineData] = Chart._prepareData(inputLine);
            lineData.forEach(pair => {
                const [x, y] = pair;
                assert.equal(x + 1, y);
            });
        });
    });

    describe('logscale', function() {
        it('should allow empty axes', function(){
            let options = Chart._parseDrawInputs([], {logscale: ''})[1];
            assert.equal(options.logscale, undefined);

            options = Chart._parseDrawInputs([], {logscale: ['']})[1];
            assert.equal(options.logscale.axes, '');
            assert.equal(options.logscale.base, 10);
        });
        it('should parse string logscale (using implicit base 10)', function(){
            let options = Chart._parseDrawInputs([], {logscale: 'x'})[1];
            assert.equal(options.logscale.axes, 'x');
            assert.equal(options.logscale.base, 10);

            options = Chart._parseDrawInputs([], {logscale: ['z']})[1];
            assert.equal(options.logscale.axes, 'z');
            assert.equal(options.logscale.base, 10);
        });
        it('should parse string logscale (using explicit base)', function(){
            let options = Chart._parseDrawInputs([], {logscale: ['cb', '2']})[1];
            assert.equal(options.logscale.axes, 'cb');
            assert.equal(options.logscale.base, 2);

            options = Chart._parseDrawInputs([], {logscale: ['xyy2', 6]})[1];
            assert.equal(options.logscale.axes, 'xyy2');
            assert.equal(options.logscale.base, 6);
        });
        it('should reject bases that are not numbers >= 1', function(){
            assert.throws(() => Chart._parseDrawInputs([], {logscale: ['xyy2', -4]}));
            assert.throws(() => Chart._parseDrawInputs([], {logscale: ['xyy2', '-9']}));
            assert.throws(() => Chart._parseDrawInputs([], {logscale: ['xyy2', '0']}));
            assert.throws(() => Chart._parseDrawInputs([], {logscale: ['xyy2', '0.5']}));
            assert.throws(() => Chart._parseDrawInputs([], {logscale: ['xyy2', '0.99']}));
            assert.throws(() => Chart._parseDrawInputs([], {logscale: ['xyy2', 'h']}));
            assert.throws(() => Chart._parseDrawInputs([], {logscale: ['xyy2', []]}));
            assert.throws(() => Chart._parseDrawInputs([], {logscale: ['xyy2', ['hello']]}));
        });
        it('should reject invalid axes spec', function(){
            assert.throws(() => Chart._parseDrawInputs([], {logscale: ['xyz2', 5]}));
            assert.throws(() => Chart._parseDrawInputs([], {logscale: ['h', 5]}));
            assert.throws(() => Chart._parseDrawInputs([], {logscale: ['  ', 5]}));
            assert.throws(() => Chart._parseDrawInputs([], {logscale: [[], 5]}));
            assert.throws(() => Chart._parseDrawInputs([], {logscale: [['x'], 5]})); // don't allow arrays

            assert.throws(() => Chart._parseDrawInputs([], {logscale: 'xyz2'}));
            assert.throws(() => Chart._parseDrawInputs([], {logscale: 'h'}));
            assert.throws(() => Chart._parseDrawInputs([], {logscale: '  '}));
            assert.throws(() => Chart._parseDrawInputs([], {logscale: []}));
        });
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

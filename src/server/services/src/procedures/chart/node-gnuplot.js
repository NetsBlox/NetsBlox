const C = require('./color');
const gnuplot = require('gnuplot'),
    _ = require('lodash');

const lineDefaults = {
    title: '',
    type: 'lines',
    smoothing: undefined,
    points: []
};

// opts defaults
const optsDefaults = {
    xRange: undefined,
    yRange: undefined,
    xLabel: undefined,
    yLabel: undefined,
    xTicks: undefined,
    isCategorical: false,
    timeSeries: {
        axis: undefined,
        inputFormat: undefined,
        outputFormat: undefined
    },
    logscale: undefined,
    grid: {
        lineType: 0,
        lineWidth: 2
    },
    title: null,
    outputName: false
};

function pointsToInlineData(points){
    let inlineStr = points.map(point => point.join(',')).join('\n');
    return ' \n' + inlineStr + '\ne';
}

// if sharing a column, using can be used to select which columns relate (x & y)
// returns a plot command string
function dataToPlot(data, opts){
    let settings = [],
        points = '';
    data.forEach(line => {
        let smoothing = line.smoothing ? `smooth ${line.smoothing}` : '';
        let columnSelection = opts.isCategorical ? '2:xtic(1)' : '1:2';
        settings.push(`'-' using ${columnSelection} title ${escape(line.title)} with ${line.type} ${smoothing}`);
        points += pointsToInlineData(line.points);
    });
    return settings.join(', ') + points;
}

function escape(string) {
    return `"${string.replace(/"/g, '\\"')}"`;
}

module.exports.draw = function(data, opts) {
    // apply the defaults
    let graph = gnuplot();
    data = data.map(line => _.merge({}, lineDefaults, line));
    opts = _.merge({}, optsDefaults, opts);
    graph.set(`term pngcairo size ${opts.width}, ${opts.height}`)
        .set(`loadpath '${__dirname}'`)
        .set('load \'xyborder.cfg\'')

        // add grid
        .set(`style line 102 lc rgb ${C.LIGHT_GRAY} lt ${opts.grid.lineType} lw ${opts.grid.lineWidth}`)
        .set('grid back ls 102');

    addColorsAndPalette(graph);

    graph.set('boxwidth 0.5')
        .set('style fill solid')
        .set('datafile separator \',\'');


    if (opts.title) graph.set(`title ${escape(opts.title)}`);
    if (opts.xRange) graph.set(`xrange [${opts.xRange.min}:${opts.xRange.max}]`);
    if (opts.yRange) graph.set(`yrange [${opts.yRange.min}:${opts.yRange.max}]`);
    if (opts.outputName) graph.set(`output '${opts.outputName}'`);
    if (opts.xLabel) graph.set(`xlabel '${opts.xLabel}'`);
    if (opts.yLabel) graph.set(`ylabel '${opts.yLabel}'`);
    if (opts.xTicks) graph.set(`xtics ${opts.xTicks.join(', ')}`);
    if (opts.timeSeries.axis) {
        graph.set(`${opts.timeSeries.axis}data time`);
        graph.set(`timefmt ${escape(opts.timeSeries.inputFormat)}`);
        graph.set(`format ${opts.timeSeries.axis} ${escape(opts.timeSeries.outputFormat)}`);
    }
    if (opts.logscale) graph.set(`logscale ${opts.logscale.axes} ${opts.logscale.base}`);

    graph.plot(dataToPlot(data, opts),{end: true});

    return graph;
};

function addColorsAndPalette(graph) {
    const colors = [
        C.TEAL,
        C.ORANGE,
        C.LILAC,
        C.MAGENTA,
        C.LIME_GREEN,
        C.BANANA,
        C.TAN,
        C.GRAY,
    ];
    colors.forEach((color, index) => 
        graph.set(`style line ${index + 1} lt 1 lc rgb ${color}`)
    );

    const palette = colors
        .map((color, index) => `${index} ${color}`)
        .join(', ');

    graph.set(`palette maxcolors ${colors.length}`)
        .set(`palette defined ( ${palette} )`);
}

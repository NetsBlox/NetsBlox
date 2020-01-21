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
        settings.push(`'-' using ${columnSelection} title '${line.title}' with ${line.type} ${smoothing}`);
        points += pointsToInlineData(line.points);
    });
    return settings.join(', ') + points;
}


module.exports.draw = function(data, opts){
    // apply the defaults
    let graph = gnuplot();
    data = data.map(line => _.merge({}, lineDefaults, line));
    opts = _.merge({}, optsDefaults, opts);
    graph.set(`term pngcairo size ${opts.width}, ${opts.height}`)
        .set(`loadpath '${__dirname}'`)
        .set('load \'xyborder.cfg\'')

        // add grid
        .set(`style line 102 lc rgb '#d6d7d9' lt ${opts.grid.lineType} lw ${opts.grid.lineWidth}`)
        .set('grid back ls 102')

        // add colors
        .set('style line 1 lt 1 lc rgb \'#1B9E77\'')  // dark teal
        .set('style line 2 lt 1 lc rgb \'#D95F02\'')  // dark orange
        .set('style line 3 lt 1 lc rgb \'#7570B3\'')  // dark lilac
        .set('style line 4 lt 1 lc rgb \'#E7298A\'')  // dark magenta
        .set('style line 5 lt 1 lc rgb \'#66A61E\'')  // dark lime green
        .set('style line 6 lt 1 lc rgb \'#E6AB02\'')  // dark banana
        .set('style line 7 lt 1 lc rgb \'#A6761D\'')  // dark tan
        .set('style line 8 lt 1 lc rgb \'#666666\'')  // dark gray

        // palette
        .set('palette maxcolors 8')
        .set('palette defined ( 0 \'#1B9E77\', 1 \'#D95F02\', 2 \'#7570B3\', 3 \'#E7298A\', 4 \'#66A61E\', 5 \'#E6AB02\', 6 \'#A6761D\',7 \'#666666\' )')
        .set('boxwidth 0.5')
        .set('style fill solid')
        .set('datafile separator \',\'');


    if (opts.title) graph.set(`title '${opts.title}'`);
    if (opts.xRange) graph.set(`xrange [${opts.xRange.min}:${opts.xRange.max}]`);
    if (opts.yRange) graph.set(`yrange [${opts.yRange.min}:${opts.yRange.max}]`);
    if (opts.outputName) graph.set(`output '${opts.outputName}'`);
    if (opts.xLabel) graph.set(`xlabel '${opts.xLabel}'`);
    if (opts.yLabel) graph.set(`ylabel '${opts.yLabel}'`);
    if (opts.xTicks) graph.set(`xtics ${opts.xTicks.join(', ')}`);
    if (opts.timeSeries.axis) {
        graph.set(`${opts.timeSeries.axis}data time`);
        graph.set(`timefmt '${opts.timeSeries.inputFormat}'`);
        graph.set(`format ${opts.timeSeries.axis} '${opts.timeSeries.outputFormat}'`);
    }

    graph.plot(dataToPlot(data, opts),{end: true});

    return graph;
};
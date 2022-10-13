/**
 * A charting service powered by gnuplot.
 *
 * @service
 * @category GLOBAL
 * @category Media
 */

const NBService = require('../utils/service'),
    rpcUtils = require('../utils'),
    gnuPlot = require('./node-gnuplot.js'),
    _ = require('lodash');
const InputTypes = require('../../input-types');
const registerTypes = require('./types');
registerTypes();

let chart = new NBService('Chart');

const defaults = {
    title: undefined,
    width: 480,
    height: 360,
    labels: [],
    types: [],
    xRange: [],
    yRange: [],
    xLabel: undefined,
    yLabel: undefined,
    xTicks: undefined,
    isCategorical: false,
    smooth: false,
    grid: 'line',
    isTimeSeries: false,
    timeInputFormat: '%s',
    timeDisplayFormat: '%H:%M',
    logscale: undefined,
};

// calculates data stats
// TODO refactor so it process one axis (one array) at a time. con: lose some performance
function calcRanges(lines, isCategorical){
    let stats = {
        y: {
            min: Number.MAX_VALUE, max: -1 * Number.MAX_VALUE
        }
    };
    if (!isCategorical){
        stats.x = {
            min: Number.MAX_VALUE, max: -1 * Number.MAX_VALUE
        };
    }
    lines.forEach(line => {

        if (!isCategorical){
            // min max of x
            let xs = line.map(pt => pt[0]);
            let xmin = Math.min.apply(null, xs);
            let xmax = Math.max.apply(null, xs);
            if( xmin < stats.x.min ) stats.x.min = xmin;
            if( xmax > stats.x.max ) stats.x.max = xmax;
        }

        // min max of y
        let ys = line.map(pt => pt[1]);
        let ymin = Math.min.apply(null, ys);
        let ymax = Math.max.apply(null, ys);
        if( ymin < stats.y.min ) stats.y.min = ymin;
        if( ymax > stats.y.max ) stats.y.max = ymax;
    });
    Object.keys(stats).forEach( key => {
        stats[key].range = stats[key].max - stats[key].min;
    });
    return stats;
}

chart._prepareData = function(input, options=defaults){
    const xShouldBeNumeric = !options.isCategorical && !options.isTimeSeries;
    
    // if the input is one line convert it to appropriate format
    if (Array.isArray(input) && !Array.isArray(input[0]) || !Array.isArray(input[0][0]) && input[0].length === 2){
        chart._logger.trace('one line input detected');
        input = [input];
    }

    input = input.map(line => {
        chart._logger.info(line);

        if (!Array.isArray(line)) {
            chart._logger.warn('input line is not an array!', line);
            throw Error('Chart input must be an array');
        }

        // If only one dimension is given
        if (line.every(pt => !Array.isArray(pt))) {
            line = line.map((pt,idx) => ([idx + 1, pt]));
        }

        line.map(pt => {
            if (!Array.isArray(pt) || pt.length !== 2) {
                chart._logger.warn('input point is not in [x,y] form', pt);
                throw Error('All input points should be in [x,y] form');
            }
            const [x,y] = pt;
            if (xShouldBeNumeric) pt[0] = parseFloat(pt[0]);
            pt[1] = parseFloat(pt[1]);

            if ((xShouldBeNumeric && isNaN(x)) || isNaN(y) ) {
                let invalidValue = (xShouldBeNumeric && isNaN(x)) ? x : y;
                invalidValue = truncate(invalidValue.toString(), 7);
                throw Error(`all [x,y] pairs should be numbers: ${invalidValue}`);
            }
            return pt;
        });
        return line;
    });
    return input;
};

/**
 * Truncates a string with an ellipsis if it is too long.
 * @param {String} word String to truncate
 * @param {Number} len Length
 */
function truncate(word, len) {
    if (word.length > len) {
        return word.substring(0, len) + '...';
    }
    return word;
}


// Generate gnuplot friendly line objects
function genGnuData(lines, lineTitles, lineTypes, smoothing){
    return lines.map((pts, idx) => {
        let lineObj = {points: pts};
        if (lineTypes) lineObj.type = lineTypes[idx];
        if (lineTitles) lineObj.title = lineTitles[idx];
        if (smoothing) lineObj.smoothing = 'csplines';
        return lineObj;
    });
}

function processOptions(options, defaults) {
    Object.keys(options).forEach(key => {
        if (options[key] === 'null' || options[key] === '') delete options[key];
        else if (options[key] === 'true') options[key] = true;
        else if (options[key] === 'false') options[key] = false;
    });
    return _.merge({}, defaults, options || {});
}

const GRID_TYPES = {
    line: { lineType: 1, lineWidth: 1 },
    dot: { lineType: 0, lineWidth: 2 },
};

const AXES_REGEX = /(x2|y2|x|y|z|cb)/g;
function isValidAxesString(axes) {
    return (axes.match(AXES_REGEX) || []).reduce((a, v) => a + v.length, 0) === axes.length;
}
async function parseLogscale(options) {
    const val = options.logscale;
    if (!val) return undefined;

    let res = undefined;
    if (typeof val === 'string') res = { axes: val, base: 10 };
    else if (Array.isArray(val)) {
        const axes = val[0];
        let base = val[1];
        if (typeof axes !== 'string') throw Error('logscale axes was not a string (text)');
        if (base !== undefined) {
            try {
                base = await InputTypes.parse.BoundedNumber(base, [1]);
            } catch (err) {
                throw Error(`Invalid logscale value: ${err.message}`);
            }
        }
        res = { axes, base: base || 10 };
    }
    else throw Error('logscale expected (axes name) or [(axes name), (base)]');

    if (!isValidAxesString(res.axes)) throw Error('axes must be a combination of axis names like x or y');
    return res;
}

chart._parseDrawInputs = async function(lines, options){
    options = processOptions(options, defaults);

    // prepare and check for errors in data
    lines = this._prepareData(lines, options);
    let stats = calcRanges(lines, options.isCategorical);
    this._logger.info('data stats:', stats);
    const relativePadding = { y: stats.y.range !== 0 ? stats.y.range * 0.05 : 1 };

    //TODO auto set to boxes if categorical? 

    let opts = _.pick(options, ['title', 'width', 'height', 'xLabel', 'yLabel', 'isCategorical']);

    opts.yRange = {
        min: stats.y.min - relativePadding.y, 
        max: stats.y.max + relativePadding.y
    };
    if (options.yRange.length === 2) opts.yRange = { min: options.yRange[0], max: options.yRange[1] };

    if (!options.isCategorical){
        relativePadding.x = stats.x.range !== 0 ? stats.x.range * 0.05 : 1;
        opts.xRange = { min: stats.x.min - relativePadding.x, max: stats.x.max + relativePadding.x };
        if (options.xRange.length === 2) opts.xRange = { min: options.xRange[0], max: options.xRange[1] };
    }

    if (options.isTimeSeries) {
        opts.timeSeries = {
            axis: 'x',
            inputFormat: options.timeInputFormat,
            outputFormat: options.timeDisplayFormat 
        };
    }

    // setup grid
    const grid = GRID_TYPES[options.grid];
    if (grid !== undefined) opts.grid = grid;

    const logscale = await parseLogscale(options);
    if (logscale !== undefined) opts.logscale = logscale;

    // if a specific number of ticks are requested
    if (options.xTicks) {
        if (options.isCategorical) throw Error('can\'t change the number of xTicks in categorical charting');
        let tickStep = (stats.x.max - stats.x.min)/options.xTicks;
        opts.xTicks = [stats.x.min, tickStep, stats.x.max];
    }

    const {labels, types, smooth} = options;
    const data = genGnuData(lines, labels, types, smooth);
    return [data, opts];
};

/**
 * Create charts and histograms from data.
 *
 * @param {Array} lines a single line or list of lines. Each line should be ``[[x1,y1], [x2,y2], ...]``.
 * @param {Object=} options Configuration for graph title, axes, and more
 * @param {String=} options.title title to show on the graph
 * @param {Number=} options.width width of the returned image
 * @param {Number=} options.height height of the returned image
 * @param {Array<String>=} options.labels labels for each line
 * @param {Array<LineType>=} options.types types for each line
 * @param {Array<Number>=} options.xRange range of X values to graph
 * @param {Array<Number>=} options.yRange range of Y values to graph
 * @param {String=} options.xLabel label on the X axis
 * @param {String=} options.yLabel label on the Y axis
 * @param {Number=} options.xTicks tick interval for the X axis
 * @param {Boolean=} options.isCategorical true to enable categorical mode
 * @param {Boolean=} options.smooth true to enable smoothing
 * @param {Enum<line,dot>=} options.grid grid type to use
 * @param {Boolean=} options.isTimeSeries true to enable time series mode
 * @param {TimeFormat=} options.timeInputFormat input time format for time series data
 * @param {TimeFormat=} options.timeDisplayFormat output time format for time series data
 * @param {Array=} options.logscale logscale settings to use
 * 
 * @returns {Image} the generated chart
 */
chart.draw = async function(lines, options={}){
    const [data, parsedOptions] = await this._parseDrawInputs(lines, options);
    try {
        var chartStream = gnuPlot.draw(data, parsedOptions);
    } catch (e) {
        throw Error('error in drawing the plot. bad input.'); // simplify error message for user
    }
    return rpcUtils.collectStream(chartStream).then( buffer => {
        rpcUtils.sendImageBuffer(this.response, buffer, this._logger);
    }).catch(this._logger.error);
};

/**
 * Get the default options for the :func:`Chart.draw` RPC.
 * 
 * @returns {Object} the default draw options
 */
chart.defaultOptions = function(){
    return rpcUtils.jsonToSnapList(defaults);
};

chart.drawLineChart = function(dataset, xAxisTag, yAxisTag, datasetTag, title){
    let lines = [];

    // testMultipleDataset credit to Dung
    let isMultipleDataset = rawArray => {
        let numLayers = (rawArray) => {
            if (typeof rawArray !== 'object') {
                return 0;
            }
            return numLayers(rawArray[0]) + 1;
        };

        return numLayers(rawArray) === 4;
    };

    if (!isMultipleDataset(dataset)){
        this._logger.trace('single line input detected');
        dataset = [dataset];
    }

    dataset.forEach(line => {
        line = line
            .map(pt => {
                let newPt = [];
                newPt.push(pt[0][1]);
                newPt.push(pt[1][1]);
                return newPt;
            })
            .sort((p1, p2) => parseFloat(p1[0]) < parseFloat(p2[0]) ? -1 : 1);
        lines.push(line);
    });

    // account for list or string datasettag
    if (!Array.isArray(datasetTag)){
        datasetTag = [datasetTag];
    }

    let opts = {
        xLabel: xAxisTag,
        yLabel: yAxisTag,
        title: title,
        isCategorical: true,
        smooth: true,
        labels: datasetTag
    };

    return chart.draw.call(this, lines, _.toPairs(opts));
};

chart.drawBarChart = function(dataset, xAxisTag, yAxisTag, datasetTag, title){
    return chart.drawLineChart.apply(this, arguments);
};

chart.COMPATIBILITY = {
    deprecatedMethods: ['drawBarChart', 'drawLineChart']
};

chart.isSupported = () => {
    if(!require('command-exists').sync('gnuplot')){
        /* eslint-disable no-console*/
        console.error('gnuplot is not installed, Chart RPC disabled.');
        /* eslint-enable no-console*/
        return false;
    }
    return true;
};

module.exports = chart;

const ApiConsumer = require('../utils/api-consumer'),
    rpcUtils = require('../utils'),
    gnuPlot = require('./node-gnuplot.js'),
    _ = require('lodash'),
    Q = require('q');

let chart = new ApiConsumer('chart');

// TODO import this from nodegnuplot and overwrite
const defaults = {
    title: undefined,
    labels: [],
    types: [],
    xRange: [],
    yRange: [],
    xLabel: undefined,
    yLabel: undefined,
    xTicks: undefined,
    timeSeriesAxis: undefined,
    timeInputFormat: '%s',
    timeOutputFormat: '%d/%m'
}

function calcRanges(lines){
    let stats = {
        x: {
            min: Number.MAX_VALUE, max: -1 * Number.MAX_VALUE
        }, 
        y: {
            min: Number.MAX_VALUE, max: -1 * Number.MAX_VALUE
        }
    };
    lines.forEach(line => {
        // min max of x
        line = _.sortBy(line, (pt => pt[0]));
        let {0 : xmin ,length : l, [l - 1] : xmax} = line.map(pt => pt[0]);
        // min max of y
        line = _.sortBy(line, (pt => pt[1]));
        let {0 : ymin , [l - 1] : ymax} = line.map(pt => pt[1]);
        if( xmin < stats.x.min ) stats.x.min = xmin;
        if( xmax > stats.x.max ) stats.x.max = xmax;
        if( ymin < stats.y.min ) stats.y.min = ymin;
        if( ymax > stats.y.max ) stats.y.max = ymax;
    })
    return stats;
}

let setupLineInput = (input) => {
}

function prepareData(lines, lineTitles, lineTypes){
    // if the input is one line convert it to appropriate format
    if (! Array.isArray(lines[0][0])){
        chart._logger.trace('one line input detected');
        lines = [lines];
    };

    return lines.map((pts, idx) => {
        // shouldn't be needed! Temp fix
        if (!Array.isArray(pts)) {
            chart._logger.warn(`input is not an array!`);
            pts = _.map(pts, function(value, index) {
                return value;
            });
        }
        pts = _.sortBy(pts, (pt => pt[0]));
        let lineObj = {points: pts};
        if (lineTypes) lineObj.type = lineTypes[idx];
        if (lineTitles) lineObj.title = lineTitles[idx];
        return lineObj;
    });
}

chart.draw = function(lines, options){
    options = rpcUtils.kvListToJson(options);
    Object.keys(options).forEach(key => {
        if (options.key === "null" || options.key === ''){
            delete options.key;
        }
    });
    options = _.merge({}, defaults, options || {});

    let data = prepareData(lines, options.labels, options.types);

    
    let opts = {title: options.title, xLabel: options.xLabel, yLabel: options.yLabel};
    if (options.xRange) opts.xRange = {min: options.xRange[0], max: options.xRange[1]};
    if (options.yRange) opts.yRange = {min: options.yRange[0], max: options.yRange[1]};
    if (options.timeSeriesAxis) {
        opts.timeSeries = {
            axis: options.timeSeriesAxis,
            inputFormat: options.timeInputFormat,
            outputFormat: options.timeOutputFormat
        };
    }
    
    // if a specific number of ticks are requested
    if (options.xTicks) {
        let ranges = calcRanges(lines);
        let tickStep = (ranges.x.max - ranges.x.min)/options.xTicks
        opts.xTicks = [ranges.x.min, tickStep, ranges.x.max]
    };

    let chartStream =  gnuPlot.draw(data, opts);
    return rpcUtils.collectStream(chartStream).then( buffer => {
        rpcUtils.sendImageBuffer(this.response, buffer, this._logger);
    }).catch(this._logger.error);
};

chart.timeSeries = function(lines, labels, title, xRange, yRange, xLabel, yLabel, timeInputFormat, timeOutputFormat){

    let data = prepareData(lines, labels);

    timeInputFormat = timeInputFormat || '%s';
    timeOutputFormat = timeOutputFormat || '%d/%m';
    
    let opts = {title: title, xLabel, yLabel, timeSeries: {}};
    if (xRange) opts.xRange = {min: xRange[0], max: xRange[1]};
    if (yRange) opts.yRange = {min: yRange[0], max: yRange[1]};
    opts.timeSeries = {
        axis: 'x',
        inputFormat: timeInputFormat,
        outputFormat: timeOutputFormat
    };
    let chartStream =  gnuPlot.draw(data, opts);
    return rpcUtils.collectStream(chartStream, this._logger).then( buffer => {
        rpcUtils.sendImageBuffer(this.response, buffer, this._logger);
    }).catch(this._logger.error);
};

chart.defaultOptions = function(){
    return rpcUtils.jsonToSnapList(defaults);
}

module.exports = chart;

const ApiConsumer = require('../utils/api-consumer');
const rpcUtils = require('../utils');
const Logger = require('../../../logger');
const logger = new Logger('netsblox:rpc:chart');
const gnuPlot = require('./node-gnuplot.js');
const _ = require('lodash');
const Q = require('q');

let chart = new ApiConsumer('chart');

chart.draw = function(lines, lineTitles, chartTitle, xRange, yRange, xLabel, yLabel){

    let data = prepareData(lines, lineTitles);
    
    let opts = {title: chartTitle, xLabel, yLabel};
    if (xRange) opts.xRange = {min: xRange[0], max: xRange[1]};
    if (yRange) opts.yRange = {min: yRange[0], max: yRange[1]};
    let chartStream =  gnuPlot.draw(data, opts);
    return rpcUtils.collectStream(chartStream).then( buffer => {
        rpcUtils.sendImageBuffer(this.response, buffer, logger);
    }).catch(logger.error);
};

chart.timeSeries = function(lines, lineTitles, chartTitle, xRange, yRange, xLabel, yLabel, timeInputFormat, timeOutputFormat){

    let data = prepareData(lines, lineTitles);

    timeInputFormat = timeInputFormat || '%s';
    timeOutputFormat = timeOutputFormat || '%d/%m';
    
    let opts = {title: chartTitle, xLabel, yLabel, timeSeries: {}};
    if (xRange) opts.xRange = {min: xRange[0], max: xRange[1]};
    if (yRange) opts.yRange = {min: yRange[0], max: yRange[1]};
    opts.timeSeries = {
        axis: 'x',
        inputFormat: timeInputFormat,
        outputFormat: timeOutputFormat
    };
    let chartStream =  gnuPlot.draw(data, opts);
    return rpcUtils.collectStream(chartStream, logger).then( buffer => {
        rpcUtils.sendImageBuffer(this.response, buffer, logger);
    }).catch(logger.error);
};

module.exports = chart;

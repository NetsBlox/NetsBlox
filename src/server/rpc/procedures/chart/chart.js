const ChartNode = require('chartjs-node');
const ApiConsumer = require('../utils/api-consumer');
const test = require('../utils/dataset-test');
const rpcUtils = require('../utils');
const Logger = require('../../../logger');
const logger = new Logger('netsblox:rpc:chart');
const gnuPlot = require('./node-gnuplot.js');
const fs = require('fs-extra');
const stream = require('stream');
const Q = require('q');

let chart = new ApiConsumer('chart');
let chartNode = new ChartNode(600, 600);
let defaultColor = [
    'rgba(74, 108, 212, 0.8)',
    'rgba(217, 77, 17, 0.8)',
    'rgba(207, 74, 217, 0.8)',
    'rgba(0, 161, 120, 0.8)',
    'rgba(143, 86, 227, 0.8)',
    'rgba(230, 168, 34, 0.8)',
    'rgba(4, 148, 220, 0.8)',
    'rgba(98, 194, 19, 0.8)',
    'rgba(243, 118, 29, 0.8)',
    'rgba(150, 150, 15, 0.8)'
];

let defaultBlack = '#666';
let defaultFont = 'Helvetica';
let defaultFontSize = [18, 20];
let defaultOption = (xAxis, yAxis, title) => {
    return {
        scales: {
            xAxes: [{
                scaleLabel: {
                    display: true,
                    labelString: xAxis,
                    fontSize: defaultFontSize[0],
                    fontFamily: defaultFont,
                    fontColor: defaultBlack
                }
            }],
            yAxes: [{
                scaleLabel: {
                    display: true,
                    labelString: yAxis,
                    fontSize: defaultFontSize[0],
                    fontFamily: defaultFont,
                    fontColor: defaultBlack
                },
                ticks: {
                    beginAtZero:false
                }
            }]
        },
        title: {
            display: true,
            text: title,
            fontSize: defaultFontSize[1],
            padding: 25
        },
        gridLines: {
            color: defaultBlack
        },
        tick: {
            fontColor: defaultBlack
        }
    };
};

chart._processDataset = function(dataset, yAxis, datasetTag, code, chartType) {
    let result =  {
        label: datasetTag,
        data: test.getField(dataset, yAxis),
        backgroundColor: defaultColor[code % 10],
        borderColor: defaultColor[code % 10]
    };
    if (chartType === 'line') {
        result.fill = false;
    }
    return result;
};

chart._processData = function(dataset, datasetTag, chartType) {
    let data = {};
    let xAxisTag = dataset[0][0][0];
    let yAxisTag = dataset[0][1][0];
    data.labels = test.getField(dataset, xAxisTag);
    data.datasets = [chart._processDataset(dataset, yAxisTag, datasetTag, 0, chartType)];
    return data;
};

chart._processMultipleData = function(dataset, datasetTag, chartType) {
    let data = {};
    let xAxisTag = dataset[0][0][0][0];
    let yAxisTag = dataset[0][0][1][0];
    data.labels = test.getField(dataset[0], xAxisTag);
    data.datasets = [];
    dataset.forEach((set, index) => {
        data.datasets.push(chart._processDataset(set, yAxisTag, datasetTag[index], index, chartType));
    });
    return data;
};

chart._testDataset = function(rawArray, datasetTag) {
    let multiple = test.isMultipleDataset(rawArray);
    if (multiple) {
        return test.testMultipleDatasets(rawArray, datasetTag);
    } else {
        return test.testValidDataset(rawArray);
    }
};

chart._drawChart = function (dataset, xAxisTag, yAxisTag, datasetTag, title, chartType) {
    if (dataset === '') {
        this.response.status(404).send('Dataset is blank');
    } else {
        let testResult = this._testDataset(dataset, datasetTag);
        if (testResult !== '') {
            this.response.status(404).send(testResult);
        } else {
            let data;
            if (test.isMultipleDataset(dataset)) {
                data = chart._processMultipleData(dataset, datasetTag, chartType);
            } else {
                data = chart._processData(dataset, datasetTag, chartType);
            }
            let chartOptions =  {
                type: chartType,
                data: data,
                options: defaultOption(xAxisTag, yAxisTag, title)
            };
        
            return chartNode.drawChart(chartOptions).then(() => {
                return chartNode.getImageBuffer('image/png');
            }).then((imageBuffer) => {
                rpcUtils.sendImageBuffer(this.response, imageBuffer);
            }).catch(err => {
                logger.warn(`chart drawing failed: ${err}`);
                this.response.status(404).send('Error with service');
            });
        }
    }
};

chart.drawBarChart = function(dataset, xAxisTag, yAxisTag, datasetTag, title) {
    return this._drawChart(dataset, xAxisTag, yAxisTag, datasetTag, title, 'bar');
};

chart.drawLineChart = function(dataset, xAxisTag, yAxisTag, datasetTag, title) {
    return this._drawChart(dataset, xAxisTag, yAxisTag, datasetTag, title, 'line');
};

chart.draw = function(lines, lineTitles, chartTitle, xRange, yRange, xLabel, yLabel){
    let data = lines.map((pts, idx) => {
        return {title: lineTitles[idx], points: pts};
    });
    
    let opts = {title: chartTitle, xLabel, yLabel};
    if (xRange) opts.xRange = {min: xRange[0], max: xRange[1]};
    if (yRange) opts.yRange = {min: yRange[0], max: yRange[1]};
    let chartStream =  gnuPlot.draw(data, opts);
    chartStream.end();  
    return rpcUtils.collectStream(chartStream).then( buffer => {
        rpcUtils.sendImageBuffer(this.response, buffer);
    })
}

chart.timeSeries = function(lines, lineTitles, chartTitle, xRange, yRange, xLabel, yLabel, timeInputFormat, timeOutputFormat){
    let data = lines.map((pts, idx) => {
        return {title: lineTitles[idx], points: pts};
    });

    timeInputFormat = timeInputFormat || '%s';
    timeOutputFormat = timeOutputFormat || '%d/%m';
    
    let opts = {title: chartTitle, yLabel, timeSeries: {}};
    if (yRange) opts.yRange = {min: yRange[0], max: yRange[1]};
    opts.timeSeries = {
        axis: 'x',
        inputFormat: timeInputFormat,
        outputFormat: timeOutputFormat
    };
    let chartStream =  gnuPlot.draw(data, opts);
    chartStream.end();  
    return rpcUtils.collectStream(chartStream).then( buffer => {
        rpcUtils.sendImageBuffer(this.response, buffer);
    })
}

module.exports = chart;

const ChartNode = require('chartjs-node');
const ApiConsumer = require('../utils/api-consumer');
const test = require('../utils/dataset-test');
const rpcUtils = require('../utils');

let chart = new ApiConsumer('chart');
let chartNode = new ChartNode(600, 600);
let defaultColor = ['rgba(74, 108, 212, 0.8)',
                    'rgba(217, 77, 17, 0.8)',
                    'rgba(207, 74, 217, 0.8)',
                    'rgba(0, 161, 120, 0.8)',
                    'rgba(143, 86, 227, 0.8)',
                    'rgba(230, 168, 34, 0.8)',
                    'rgba(4, 148, 220, 0.8)',
                    'rgba(98, 194, 19, 0.8)',
                    'rgba(243, 118, 29, 0.8)',
                    'rgba(150, 150, 15, 0.8)'];

let black = '#666';
let defaultOption = (xAxis, yAxis, title) => {
    return {
        scales: {
            xAxes: [{
                scaleLabel: {
                    display: true,
                    labelString: xAxis,
                    fontSize: 20,
                    fontFamily: 'sans-serif',
                    fontColor: '#666'
                }
            }],
            yAxes: [{
                scaleLabel: {
                    display: true,
                    labelString: yAxis,
                    fontSize: 20,
                    fontFamily: 'sans-serif',
                    fontColor: black
                },
                ticks: {
                    beginAtZero:true
                }
            }]
        },
        title: {
            display: true,
            text: title,
            fontSize: 20,
            padding: 25
        },
        legend: {
            display: false
        },
        gridLines: {
            color: black
        },
        tick: {
            fontColor: black
        }
    };
};

chart._processDataset = function(dataset, yAxis, datasetTag, code) {
    return {
        label: datasetTag,
        data: test.getField(dataset, yAxis),
        backgroundColor: defaultColor[code % 10]
    };
};

chart._processData = function(dataset, numDataset, xAxisTag, yAxisTag, datasetTag) {
    let data = {};
    data.labels = test.getField(dataset, xAxisTag);
    data.datasets = [chart._processDataset(dataset, yAxisTag, datasetTag, 0)];
    return data;
};

chart._processMultipleData = function(dataset, numDataset, xAxisTag, yAxisTag, datasetTag) {
    let data = {};
    data.labels = test.getField(dataset[0], xAxisTag);
    data.datasets = [];
    dataset.forEach((set, index) => {
        data.datasets.push(chart._processDataset(set, yAxisTag, datasetTag[index], index));
    });
    return data;
};

chart._testDataset = function(rawArray, numDataset, xAxis, yAxis) {
    let testResult;
    if (numDataset === 1) {
        testResult = test.testValidDataset(rawArray, xAxis, yAxis);
    } else if (numDataset >= 1) {
        testResult = test.testMultipleDatasets(rawArray, xAxis, yAxis);
    } else {
        return 'Invalid number of datasets';
    }
    return testResult;
};

chart._drawChart = function (dataset, numDataset, xAxisTag, yAxisTag, datasetTag, title, chartType) {
    numDataset = parseInt(numDataset);
    let testResult = this._testDataset(dataset, numDataset, xAxisTag, yAxisTag);
    if (testResult !== '') {
        //this.response.status(404).send(testResult);
        return '';
    }
    let data;
    if (numDataset === 1) {
        data = chart._processData(dataset, numDataset, xAxisTag, yAxisTag, datasetTag);
    } else {
        data = chart._processMultipleData(dataset, numDataset, xAxisTag, yAxisTag, datasetTag);
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
    }).catch(() => {
        this.response.status(404).send('');
    });
};

chart.drawBarChart = function(dataset, numDataset, xAxisTag, yAxisTag, datasetTag, title) {
    return this._drawChart(dataset, numDataset, xAxisTag, yAxisTag, datasetTag, title, 'bar');
};

chart.drawLineChart = function(dataset, numDataset, xAxisTag, yAxisTag, datasetTag, title) {
    return this._drawChart(dataset, numDataset, xAxisTag, yAxisTag, datasetTag, title, 'line');
};


module.exports = chart;
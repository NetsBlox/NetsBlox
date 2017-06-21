const ApiConsumer = require('../utils/api-consumer'),
    ChartNode = require('chartjs-node');

let chart = new ApiConsumer('chart');
let chartNode = new ChartNode(600, 600);
let defaultColor = 'rgba(74, 108, 212, 0.8)';

let defaultOption = (xAxis, yAxis, title) => {
    return {
        scales: {
            xAxes: [{
                scaleLabel: {
                    display: true,
                    labelString: xAxis,
                    fontSize: 16
                }
            }],
            yAxes: [{
                scaleLabel: {
                    display: true,
                    labelString: yAxis,
                    fontSize: 16
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
            padding: 20
        },
        legend: {
            display: false
        }
    };
};

let getField = (input, fieldName) => {
    return input.map((entry) => {
        return entry.find((cur) => {
            return cur[0] === fieldName;
        });
    }).reduce((acc, cur) => {
        if (parseInt(cur[1]) && parseInt(cur[1]).toString().length === cur[1].length) {
            return acc.concat(parseInt(cur[1]));
        }
        return acc.concat(cur[1]);
    }, []);
};

chart._processDataset = function(rawArray, xAxis, yAxis, title, chartType) {
    let data = {};
    data.labels = getField(rawArray, xAxis);
    data.datasets = [{
        label: yAxis,
        data: getField(rawArray, yAxis),
        backgroundColor: defaultColor
    }];
    //data.datasets = yAxis.map((dataset) => {
    //    return {
    //        label: dataset,
    //        data: getField(rawArray, dataset),
    //        backgroundColor: defaultColor
    //    };
    //});
    if (chartType === 'line') {
        data.datasets.map((item) => {
            item.fill = false;
            item.borderColor = defaultColor;
        });
    }
    return {
        type: chartType,
        data: data,
        options: defaultOption(xAxis, yAxis, title)
    };
};

chart._drawChart = function (chartOptions) {
    return chartNode.drawChart(chartOptions).then(() => {
        return chartNode.getImageBuffer('image/png');
    }).then((imageBuffer) => {
        this.response.set('cache-control', 'private, no-store, max-age=0');
        this.response.set('content-type', 'image/png');
        this.response.set('content-length', imageBuffer.length);
        this.response.set('connection', 'close');
        this.response.status(200).send(imageBuffer);
        this._logger.trace('sent the image');
    }).catch(() => {
        this.response.status(404).send('');
    });
};

chart.drawBarChart = function(dataset, xAxisTag, yAxisTag, title) {
    return this._drawChart(this._processDataset(dataset, xAxisTag, yAxisTag, title, 'bar'));
};

chart.drawLineChart = function(dataset, xAxisTag, yAxisTag, title) {
    return this._drawChart(this._processDataset(dataset, xAxisTag, yAxisTag, title, 'line'));
};

module.exports = chart;
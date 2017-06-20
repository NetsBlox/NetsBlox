const ApiConsumer = require('../utils/api-consumer'),
    ChartNode = require('chartjs-node');

let chart = new ApiConsumer('chart');
let chartNode = new ChartNode(600, 600);
let defaultColor = 'rgba(74, 108, 212, 0.8)';
chart._dataset = null;
chart._image = null;

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
chart._processDataset = function(rawDataset, xAxis, yAxis, title, chartType) {
    let rawArray = JSON.parse('[' + rawDataset + ']');
    let data = {};
    data.labels = rawArray.map((item) => item[0]);
    data.datasets = [{
        label: xAxis,
        data: rawArray.map((item) => {
            return parseInt(item[1]);
        }),
        backgroundColor: defaultColor
    }];
    if (chartType === 'line') {
        data.datasets[0].fill = false;
        data.datasets[0].borderColor = defaultColor;
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

chart.drawBarChart = function(dataset, xAxisTag, yAxis, title) {
    let chartOptions = this._processDataset(dataset, xAxisTag, yAxis, title, 'bar');
    return this._drawChart(chartOptions);
};

chart.drawLineChart = function(dataset, xAxisTag, yAxis, title) {
    let chartOptions = this._processDataset(dataset, xAxisTag, yAxis, title, 'line');
    return this._drawChart(chartOptions);
};

module.exports = chart;
const ApiConsumer = require('../utils/api-consumer'),
    ChartNode = require('chartjs-node');

let chart = new ApiConsumer('chart');
let chartNode = new ChartNode(600, 600);
chart._dataset = null;
chart._image = null;

chart._processDataset = function(rawDataset, xAxis, yAxis, title) {
    let rawArray = JSON.parse('[' + rawDataset + ']');
    let data = {};
    data.labels = rawArray.map((item) => item[0]);
    data.datasets = [{
        label: xAxis,
        data: rawArray.map((item) => {
            return parseInt(item[1]);
        }),
        backgroundColor: 'rgba(74, 108, 212, 0.8)'
    }];
    return {
        type: 'bar',
        data: data,
        options: {
            scales: {
                yAxes: [{
                    ticks: {
                        beginAtZero:true
                    }
                }]
            },
            title: {
                display: true,
                text: title
            }
        }
    };
};

chart.drawBarChart = function(dataset, xAxisTag, yAxis, title) {
    let chartOptions = this._processDataset(dataset, xAxisTag, title);
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

module.exports = chart;
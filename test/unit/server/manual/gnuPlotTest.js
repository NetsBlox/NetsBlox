const gnuPlot = require('./../../../../src/server/rpc/procedures/chart/node-gnuplot.js'),
    fs = require('fs'),
    timeSData = require('./testLines.json');

let multiLineData = [
    {
        type: 'line',
        points: [[1,2],[2,3],[4,2]]
    },
    {
        title: 'temp',
        points: [[5,2],[2,3],[3,1]]
    },
    {
        title: 'temp',
        points: [[1,2],[2,1]]
    }
];

// limitData timeS
function filterPoints(pt){
    const startDate = new Date('2017-08-21T17:00:00.000Z');
    const endDate = new Date('2017-08-21T20:00:00.000Z');
    return (pt.temp !== -9999 && pt.readAt > startDate && pt.readAt < endDate);
}

//prep points
let lines = timeSData
    .map(line => line.map(pt => {
        pt.readAt = new Date(pt.readAt);
        return pt;
    })
        .filter(filterPoints)
        .map(pt => {
            return [Math.floor(pt.readAt.getTime()/1000), pt.temp];
        })
    );

let weatherData = lines.map((pts, idx) => {
    return {title: 'lineTitle', points: pts};
});

let timeInputFormat = '%s';
let timeOutputFormat = '%H:%M';

let opts = {title: 'chartTitle', timeSeries: {}};
opts.timeSeries = {
    axis: 'x',
    inputFormat: timeInputFormat,
    outputFormat: timeOutputFormat
};
// let chartStream =  gnuPlot.draw(weatherData, opts);
// let writeSt = fs.createWriteStream('plotTest.png');
// chartStream.pipe(writeSt);

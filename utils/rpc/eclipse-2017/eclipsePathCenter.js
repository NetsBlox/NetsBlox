const nasaCenters = [
[44.87, -124.84166667, '17:16'],
[44.81, -123.205, '17:18'],
[44.73333333, -121.63333333, '17:20'],
[44.63833333, -120.12, '17:22'],
[44.53, -118.65833333, '17:24'],
[44.40666667, -117.24666667, '17:26'],
[44.27166667, -115.88, '17:28'],
[44.12333333, -114.555, '17:30'],
[43.965, -113.27, '17:32'],
[43.795, -112.02166667, '17:34'],
[43.61666667, -110.80833333, '17:36'],
[43.42666667, -109.62666667, '17:38'],
[43.22833333, -108.475, '17:40'],
[43.02166667, -107.35166667, '17:42'],
[42.80833333, -106.25666667, '17:44'],
[42.585, -105.18666667, '17:46'],
[42.355, -104.14, '17:48'],
[42.11833333, -103.11666667, '17:50'],
[41.875, -102.115, '17:52'],
[41.625, -101.135, '17:54'],
[41.36833333, -100.17333333, '17:56'],
[41.10666667, -99.23, '17:58'],
[40.83833333, -98.305, '18:00'],
[40.565, -97.395, '18:02'],
[40.285, -96.50166667, '18:04'],
[40, -95.62333333, '18:06'],
[39.71, -94.76, '18:08'],
[39.415, -93.90833333, '18:10'],
[39.11666667, -93.07, '18:12'],
[38.81166667, -92.24333333, '18:14'],
[38.50166667, -91.42666667, '18:16'],
[38.18833333, -90.62166667, '18:18'],
[37.87, -89.82666667, '18:20'],
[37.54666667, -89.04, '18:22'],
[37.22, -88.26166667, '18:24'],
[36.88833333, -87.49166667, '18:26'],
[36.55166667, -86.72833333, '18:28'],
[36.21166667, -85.97166667, '18:30'],
[35.86833333, -85.22166667, '18:32'],
[35.52, -84.47666667, '18:34'],
[35.16666667, -83.735, '18:36'],
[34.81, -82.99833333, '18:38'],
[34.44833333, -82.265, '18:40'],
[34.08333333, -81.535, '18:42'],
[33.715, -80.80666667, '18:44'],
[33.34166667, -80.07833333, '18:46'],
[32.96333333, -79.35333333, '18:48']
];

function clockToSeconds(clockStr){
    let holder = clockStr.split(':');
    let hour = parseInt(holder[0]);
    let min = parseInt(holder[1]);
    return hour*3600 + min*60;
}

function secondsToClock(seconds){
    let time = new Array(3);
    time[0] = Math.floor(seconds/3600);
    time[1] = Math.floor(seconds%3600/60);
    time[2] = Math.floor(seconds%60);
    return time.join(':');
}

function avg(a,b){
    return (a+b)/2;
}

function addMidPoints(points){
    // create mid points to increase the resolution
    let midPoints = [];
    for(let i = 0; i < points.length; i++){
        // OPTIMIZE insert as you are going through the array so there is no need for soritng later on
        let point = points[i];
        let nextPoint = points[i+1];
        if (!nextPoint) break; // this is the last pair
        let midPoint = [avg(point[0],nextPoint[0]),avg(point[1],nextPoint[1]), avg(point[2],nextPoint[2])];
        midPoints.push(midPoint);
    }
    let pathPoints = midPoints.concat(points);
    pathPoints.sort((a,b) => a[1]-b[1]); // sort by ascending longitude
    return pathPoints;
}

module.exports = () => {
    let nasa2 = nasaCenters.map(p => {
        return [p[0],p[1],clockToSeconds(p[2])];
        // p[2] = clockToSeconds(p[2]); // wasted so much time here
        // return p;
    });
    let pathPoints = addMidPoints(nasa2);
    pathPoints = addMidPoints(pathPoints);
    // pathPoints.sort((a,b) => a[1]-b[1]); // sort by ascending longitude
    return pathPoints.map(p=>{
        return [p[0],p[1],secondsToClock(p[2])];
    });
};

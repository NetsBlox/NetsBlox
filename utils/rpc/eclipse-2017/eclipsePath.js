const nasaCenters = require('./centerPoints.json'),
    turf = require('turf');

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
        let loc1 = point.slice(0,2);
        let loc2 = nextPoint.slice(0,2);
        let midLoc = turf.midpoint(turf.point([loc1[1],loc1[0]]),turf.point([loc2[1],loc2[0]])).geometry.coordinates;
        let midPoint = [midLoc[1], midLoc[0], avg(point[2],nextPoint[2])];
        midPoints.push(midPoint);
    }
    let pathPoints = midPoints.concat(points);
    pathPoints.sort((a,b) => a[1]-b[1]); // sort by ascending longitude
    return pathPoints;
}

module.exports = {
    center: () => {
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
    },
    clockToSeconds,
    secondsToClock,
    addMidPoints
};

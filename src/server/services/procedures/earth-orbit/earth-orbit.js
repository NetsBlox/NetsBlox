const fs = require('fs');
const path = require('path');
const _ = require('lodash');

const EarthOrbit = {};
EarthOrbit._data1 = [];
EarthOrbit._data2 = [];
EarthOrbit._data3 = [];

let timeConversion = function(time) {
    return (2000 + 1000*time);
}

let adjustValue = function(value) {
    if(value.charAt(value.length-4)=='D') {
        return Number(value.substring(0,value.length-4)) * Math.pow(10,Number(value.substring(value.length-3,value.length)));
    } else {
        return value;
    }
}

const importData2004 = function(line) {
    let [year, eccentricity, obliquity, longitude] = line.trim().split(/\s+/);
    if(year.charAt(year.length-1)=='.') {
        year = timeConversion(Number(year.substring(0,year.length-1)));
    } else {
        year = timeConversion(year);
    }
    eccentricity = adjustValue(eccentricity);
    obliquity = adjustValue(obliquity);
    longitude = adjustValue(longitude);
    EarthOrbit._data1.push({year, eccentricity, obliquity, longitude});
}

const importDataInsol = function(line) {
    let [year, value] = line.trim().split(/\s+/);
    year = timeConversion(year);
    EarthOrbit._data2.push({year, value});
}

const importDataPrec = function(line) {
    let [year, value] = line.trim().split(/\s+/);
    year = timeConversion(year);
    EarthOrbit._data3.push({year, value});
}

let lines1 = fs.readFileSync(path.join(__dirname, 'INSOLP.LA2004.BTL.ASC'), 'utf8').split('\n');
lines1.splice(0,1);
lines1.reverse();
lines1.splice(0,1);
let lines2 = fs.readFileSync(path.join(__dirname, 'INSOLN.LA2004.BTL.250.ASC'), 'utf8').split('\n');
lines1.concat(lines2).forEach(line=>importData2004(line));

fs.readFileSync(path.join(__dirname, 'insolation.txt'), 'utf8')
    .split('\n')
    .forEach(line=>importDataInsol(line));

fs.readFileSync(path.join(__dirname, 'precession.txt'), 'utf8')
    .split('\n')
    .forEach(line=>importDataPrec(line));

EarthOrbit.get2004Longitude = function(startyear, endyear) {
    return this._data1
        .map(data => [data.year, Number(data.longitude)])
        .filter(data => data[0] >= startyear && data[0] <= endyear);
}

EarthOrbit.get2004Obliquity = function(startyear, endyear) {
    return this._data1
        .map(data => [data.year, Number(data.obliquity)])
        .filter(data => data[0] >= startyear && data[0] <= endyear);
}

EarthOrbit.get2004Eccentricity = function(startyear, endyear) {
    return this._data1
        .map(data => [data.year, Number(data.eccentricity)])
        .filter(data => data[0] >= startyear && data[0] <= endyear);
}

EarthOrbit.get2004Insolation = function(startyear, endyear) {
    return this._data2
        .map(data => [data.year, Number(data.value)])
        .filter(data => data[0] >= startyear && data[0] <= endyear);
}

EarthOrbit.get2004Precession = function(startyear, endyear) {
    return this._data3
        .map(data => [data.year, Number(data.value)])
        .filter(data => data[0] >= startyear && data[0] <= endyear);
}

function meanLongitude(ecc, longitude) {
    const adL = 0 - longitude;
    return 0-2*ecc*Math.sin(adL)+(3*Math.pow(ecc,2)/4+Math.pow(ecc,4)/8)*Math.sin(2*adL)-(Math.pow(ecc,3)/3+Math.pow(ecc,5)/8)*Math.sin(3*adL)
            +5*Math.pow(ecc,4)/32*Math.sin(4*adL)-3*Math.pow(ecc,5)/40*Math.sin(5*adL);
}

function trueLongitude(meanLon, ecc, longitude) {
    let adL = meanLon - longitude;
    return meanLon+(2*ecc-Math.pow(ecc,3)/4+5*Math.pow(ecc,5)/96)*Math.sin(adL)+(5*Math.pow(ecc,2)/4-11*Math.pow(ecc,4)/24)*Math.sin(2*adL)
            +(13*Math.pow(ecc,3)/12-43*Math.pow(ecc,5)/64)*Math.sin(3*adL)+103*Math.pow(ecc,4)/96*Math.sin(4*adL)+1097*Math.pow(ecc,5)/960*Math.sin(5*adL);
}

function dailyInsolation(tLongi, ecc, obl, longi, lat) {
    const pi = 3.1415926535897932;
    const solarConstant = 1368;
    let insol = 0;

    //true anomaly
    const anom = tLongi - longi;

    //earth-sun distance
    const cosv = Math.cos(anom);
    let aux = 1 + ecc*cosv;
    let dist = (1-Math.pow(ecc,2))/aux;

    //delination of the sun
    let sinusdelta = Math.sin(obl)*Math.sin(tLongi);
    let delta = Math.asin(sinusdelta);

    //lattitudes of sunset and lift
    aux = pi/2 - Math.abs(delta);
    if(((0 - aux) < lat) && (lat < aux)) {
        //time angle of sunrise and and sunset
        let sr = (0-Math.tan(lat))*Math.tan(delta);
        let ss = Math.acos(sr);

        insol = (ss*Math.sin(lat)*Math.sin(delta)+Math.cos(lat)*Math.cos(delta)*Math.sin(ss));
        insol = insol*solarConstant/(pi*Math.pow(dist,2));
        return insol;
    }

    //latitudes without laying
    let a1 = pi/2 - delta;
    let a2 = pi/2 + delta;
    if((lat >= a1) || (lat <= (0-a2))) {
        insol = solarConstant*Math.sin(lat)*Math.sin(delta)/Math.pow(dist,2);
        return insol;
    }

    //latitude without lifting
    if((lat <= (0-a1)) || (lat >= a2)) {
        return insol;
    }
}

function integrate (f, start, end, step) {
  let total = 0;
  step = step || 0.01;
  for (let x = start; x < end; x += step) {
    total += f(x + step / 2) * step;
  }
  return total;
}

function insolationCalculation(ecc, longitude, obl) {
    const pi = 3.1415926535897932;
    //const solarConstant = 1368;
    const lat = 65;
    const month = 6;
    let longi = longitude + pi;
    let ml0 = meanLongitude(ecc,longi);
    let ml1 = ml0+(month-4)*pi*30/180;
    let ml2 = ml1+pi*30/180;

    function F(ml) {
        let tLongi = trueLongitude(ml,ecc,longi);
        let insol = dailyInsolation(tLongi,ecc,longi,obl,lat);
        return insol;
    }
    return integrate(F,ml1,ml2,0.01)/30/pi*180;
}

EarthOrbit.getInsol = function() {
    return this._data1
        .map(data => [data.year, insolationCalculation(data.eccentricity,data.longitude,data.obliquity)]);
}

module.exports = EarthOrbit;
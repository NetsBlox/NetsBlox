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

module.exports = EarthOrbit;
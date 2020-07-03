/**
 * Access to 2004 Astronomical Solutions for Earth Paleoclimates.
 *
 * For more information, check out
 * http://vo.imcce.fr/insola/earth/online/earth/earth.html
 *
 * Original datasets are available at
 * http://vo.imcce.fr/insola/earth/online/earth/La2004/INSOLN.LA2004.BTL.100.ASC
 * http://vo.imcce.fr/insola/earth/online/earth/La2004/INSOLN.LA2004.BTL.250.ASC
 * http://vo.imcce.fr/insola/earth/online/earth/La2004/INSOLN.LA2004.BTL.ASC
 * http://vo.imcce.fr/insola/earth/online/earth/La2004/INSOLP.LA2004.BTL.ASC
 * http://vo.imcce.fr/webservices/miriade/proxy.php?file=http://145.238.217.35//tmp/insola/insolaouto7Yk3u&format=text
 * http://vo.imcce.fr/webservices/miriade/proxy.php?file=http://145.238.217.38//tmp/insola/insolaouteXT96X&format=text
 * @alpha
 * @service
 * @category Science
 * @category Climate
 */
const fs = require('fs');
const path = require('path');

const EarthOrbit = {};

// this contains eccentricity, obliquity, and longitude data
EarthOrbit._dataEccOblLongi = [];

// this contains insolation data 
EarthOrbit._dataInsolation = [];

// the contains precession data
EarthOrbit._dataPrecession = [];

// converting time to year CE, note: the present in here is the year 2000
// because it is not using BP present (1950)
let timeConversion = function(time) {
    return (2000 + 1000*time);
};

// Initialize startyear to -1000000 CE and endyear to 1000000 CE if no inputs are given.
let checkInputYear = function(startyear, endyear) {
    if(startyear == null) {
        startyear = -1000000;
    }
    if(endyear == null) {
        endyear = 1000000;
    }
    return [startyear, endyear];
}

// Normalize all time values to decimal numbers so that they can be used for computations. 
// For example, converting 10506D-05 to 0.10506
let parseDecimalValue = function(value) {
    if(value.charAt(value.length-4)=='D') {
        return Number(value.substring(0,value.length-4)) * Math.pow(10,Number(value.substring(value.length-3,value.length)));
    } else {
        return value;
    }
};

// reading and importing obliquity, eccentricity, and longitude data
const importData2004 = function(line) {
    let [year, eccentricity, obliquity, longitude] = line.trim().split(/\s+/);
    if(year.charAt(year.length-1)=='.') {
        year = timeConversion(Number(year.substring(0,year.length-1)));
    } else {
        year = timeConversion(year);
    }
    eccentricity = parseDecimalValue(eccentricity);
    obliquity = parseDecimalValue(obliquity);
    longitude = parseDecimalValue(longitude);
    EarthOrbit._dataEccOblLongi.push({year, eccentricity, obliquity, longitude});
};

// reading and importing insolation data
const importDataInsol = function(line) {
    let [year, value] = line.trim().split(/\s+/);
    year = timeConversion(year);
    EarthOrbit._dataInsolation.push({year, value});
};

// reading and importing precession data
const importDataPrec = function(line) {
    let [year, value] = line.trim().split(/\s+/);
    year = timeConversion(year);
    EarthOrbit._dataPrecession.push({year, value});
};

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

/**
 * Get longitude of perihelion from moving equinox by year. For more information about this, please visit:
 * https://www.physics.ncsu.edu/classes/astron/orbits.html
 *
 * If a start and end year is provided, only measurements within the given range will be
 * returned.
 *
 * @param {Number=} startyear Year to begin data at
 * @param {Number=} endyear Year to begin data at
 * @returns {Array} longitude - longitude of perihelion from moving equinox
 */
EarthOrbit.get2004Longitude = function(startyear, endyear) {
    [startyear,endyear] = checkInputYear(endyear,startyear);
    return this._dataEccOblLongi
        .map(data => [data.year, Number(data.longitude)])
        .filter(data => data[0] >= startyear && data[0] <= endyear);
};

/**
 * Get obliquity by year. For more information about obliquity, please visit:
 * https://climate.nasa.gov/news/2948/milankovitch-orbital-cycles-and-their-role-in-earths-climate/
 *
 * If a start and end year is provided, only measurements within the given range will be
 * returned.
 *
 * @param {Number=} startyear Year to begin data at
 * @param {Number=} endyear Year to begin data at
 * @returns {Array} obliquity
 */
EarthOrbit.get2004Obliquity = function(startyear, endyear) {
    [startyear,endyear] = checkInputYear(endyear,startyear);
    return this._dataEccOblLongi
        .map(data => [data.year, Number(data.obliquity)])
        .filter(data => data[0] >= startyear && data[0] <= endyear);
};

/**
 * Get eccentricity by year. For more information about eccentricity, please visit: 
 * https://climate.nasa.gov/news/2948/milankovitch-orbital-cycles-and-their-role-in-earths-climate/
 *
 * If a start and end year is provided, only measurements within the given range will be
 * returned.
 *
 * @param {Number=} startyear Year to begin data at
 * @param {Number=} endyear Year to begin data at
 * @returns {Array} eccentricity
 */
EarthOrbit.get2004Eccentricity = function(startyear, endyear) {
    [startyear,endyear] = checkInputYear(endyear,startyear);
    return this._dataEccOblLongi
        .map(data => [data.year, Number(data.eccentricity)])
        .filter(data => data[0] >= startyear && data[0] <= endyear);
};

/**
 * Get insolation by year. Insolation here is the amount of solar radiation received at 65 N in June on Earth.
 *
 * If a start and end year is provided, only measurements within the given range will be
 * returned.
 *
 * @param {Number=} startyear Year to begin data at
 * @param {Number=} endyear Year to begin data at
 * @returns {Array} insolation
 */
EarthOrbit.get2004Insolation = function(startyear, endyear) {
    [startyear,endyear] = checkInputYear(endyear,startyear);
    return this._dataInsolation
        .map(data => [data.year, Number(data.value)])
        .filter(data => data[0] >= startyear && data[0] <= endyear);
};

/**
 * Get precession by year. For more information about precession, please visit:
 * https://climate.nasa.gov/news/2948/milankovitch-orbital-cycles-and-their-role-in-earths-climate/
 *
 * If a start and end year is provided, only measurements within the given range will be
 * returned.
 *
 * @param {Number=} startyear Year to begin data at
 * @param {Number=} endyear Year to begin data at
 * @returns {Array} precession
 */
EarthOrbit.get2004Precession = function(startyear, endyear) {
    [startyear,endyear] = checkInputYear(endyear,startyear);
    return this._dataPrecession
        .map(data => [data.year, Number(data.value)])
        .filter(data => data[0] >= startyear && data[0] <= endyear);
};

module.exports = EarthOrbit;
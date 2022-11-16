/**
 * Access to Astronomical Solutions for Earth Paleoclimates. There are three researches (in 1993, 2004, and 2010) about 
 * earth orbital parameters' data. This service only uses the 2004 data. 
 *
 * For more information, check out
 * http://vo.imcce.fr/insola/earth/online/earth/earth.html.
 *
 * Original datasets are available at:
 * 
 * - http://vo.imcce.fr/insola/earth/online/earth/La2004/INSOLN.LA2004.BTL.100.ASC
 * - http://vo.imcce.fr/insola/earth/online/earth/La2004/INSOLN.LA2004.BTL.250.ASC
 * - http://vo.imcce.fr/insola/earth/online/earth/La2004/INSOLN.LA2004.BTL.ASC
 * - http://vo.imcce.fr/insola/earth/online/earth/La2004/INSOLP.LA2004.BTL.ASC
 * - http://vo.imcce.fr/webservices/miriade/proxy.php?file=http://145.238.217.35//tmp/insola/insolaouto7Yk3u&format=text
 * - http://vo.imcce.fr/webservices/miriade/proxy.php?file=http://145.238.217.38//tmp/insola/insolaouteXT96X&format=text
 * 
 * @service
 * @category Astronomy
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

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
    assert(!isNaN(Number(time)));
    return (2000 + 1000*time);
};

// Normalize all time values to decimal numbers so that they can be used for computations. 
// For example, converting 10506D-05 to 0.10506
let parseDecimalValue = function(value) {
    if(value.charAt(value.length-4)=='D') {
        value = Number(value.substring(0,value.length-4)) * Math.pow(10,Number(value.substring(value.length-3,value.length)));
    } 
    assert(!isNaN(Number(value)));
    return value;
};

// parsing obliquity, eccentricity, and longitude data line by line
const parseObliEccLongiData = function(line) {
    let [year, eccentricity, obliquity, longitude] = line.trim().split(/\s+/);
    if(year.charAt(year.length-1)=='.') {
        year = timeConversion(Number(year.substring(0,year.length-1)));
    } else {
        year = timeConversion(year);
    }
    eccentricity = parseDecimalValue(eccentricity);
    obliquity = parseDecimalValue(obliquity);
    longitude = parseDecimalValue(longitude);
    return {year, eccentricity, obliquity, longitude};
};

const parseInsolationData = function(line) {
    let [year, insolation] = line.trim().split(/\s+/);
    assert(!isNaN(Number(insolation)));
    year = timeConversion(year);
    return {year, insolation};
};

const parsePrecessionData = function(line) {
    let [year, precession] = line.trim().split(/\s+/);
    assert(!isNaN(Number(precession)));
    year = timeConversion(year);
    return {year, precession};
};

EarthOrbit._dataEccOblLongi = fs.readFileSync(path.join(__dirname, 'INSOLP.LA2004.BTL.ASC'), 'utf8').split('\n')
    .slice(1, -1)
    .reverse()
    .concat(fs.readFileSync(path.join(__dirname, 'INSOLN.LA2004.BTL.250.ASC'), 'utf8').split('\n'))
    .map(line => parseObliEccLongiData(line));

EarthOrbit._dataInsolation = fs.readFileSync(path.join(__dirname, 'insolation.txt'), 'utf8')
    .split('\n')
    .map(line=>parseInsolationData(line));

EarthOrbit._dataPrecession = fs.readFileSync(path.join(__dirname, 'precession.txt'), 'utf8')
    .split('\n')
    .map(line=>parsePrecessionData(line));

/**
 * Get longitude of perihelion from moving equinox by year. For more information about this, please visit:
 * https://www.physics.ncsu.edu/classes/astron/orbits.html
 *
 * If ``startyear`` or ``endyear`` is provided, only measurements within the given range will be returned.
 *
 * @param {Number=} startyear first year of data to include
 * @param {Number=} endyear last year of data to include
 * @returns {Array} longitude - longitude of perihelion from moving equinox
 */
EarthOrbit.getLongitude = function(startyear = -Infinity, endyear = Infinity) {
    return this._dataEccOblLongi
        .filter(data => data.year >= startyear && data.year <= endyear)
        .map(data => [data.year, data.longitude]);
};

/**
 * Get obliquity by year. For more information about obliquity, please visit:
 * https://climate.nasa.gov/news/2948/milankovitch-orbital-cycles-and-their-role-in-earths-climate/
 *
 * If ``startyear`` or ``endyear`` is provided, only measurements within the given range will be returned.
 *
 * @param {Number=} startyear first year of data to include
 * @param {Number=} endyear last year of data to include
 * @returns {Array} list of historical obliquity values for each year
 */
EarthOrbit.getObliquity = function(startyear = -Infinity, endyear = Infinity) {
    return this._dataEccOblLongi
        .filter(data => data.year >= startyear && data.year <= endyear)
        .map(data => [data.year, data.obliquity]);
};

/**
 * Get eccentricity by year. For more information about eccentricity, please visit: 
 * https://climate.nasa.gov/news/2948/milankovitch-orbital-cycles-and-their-role-in-earths-climate/
 *
 * If ``startyear`` or ``endyear`` is provided, only measurements within the given range will be returned.
 *
 * @param {Number=} startyear first year of data to include
 * @param {Number=} endyear last year of data to include
 * @returns {Array} list of historical eccentricity values for each year
 */
EarthOrbit.getEccentricity = function(startyear = -Infinity, endyear = Infinity) {
    return this._dataEccOblLongi
        .filter(data => data.year >= startyear && data.year <= endyear)
        .map(data => [data.year, data.eccentricity]);
};

/**
 * Get insolation by year. Insolation here is the amount of solar radiation received at 65 N in June on Earth.
 *
 * If ``startyear`` or ``endyear`` is provided, only measurements within the given range will be returned.
 *
 * @param {Number=} startyear first year of data to include
 * @param {Number=} endyear last year of data to include
 * @returns {Array} list of historical insolation values for each year
 */
EarthOrbit.getInsolation = function(startyear = -Infinity, endyear = Infinity) {
    return this._dataInsolation
        .filter(data => data.year >= startyear && data.year <= endyear)
        .map(data => [data.year, data.insolation]);
};

/**
 * Get precession by year. For more information about precession, please visit:
 * https://climate.nasa.gov/news/2948/milankovitch-orbital-cycles-and-their-role-in-earths-climate/
 *
 * If ``startyear`` or ``endyear`` is provided, only measurements within the given range will be returned.
 *
 * @param {Number=} startyear first year of data to include
 * @param {Number=} endyear last year of data to include
 * @returns {Array} list of historical precession values for each year
 */
EarthOrbit.getPrecession = function(startyear = -Infinity, endyear = Infinity) {
    return this._dataPrecession
        .filter(data => data.year >= startyear && data.year <= endyear)
        .map(data => [data.year, data.precession]);
};

module.exports = EarthOrbit;

/**
 * The FBICrimeData Service provides access to the FBI database,
 * containing catalogued information on crime statistics.
 * 
 * @alpha
 * @service
 * @category Statistics
 */
'use strict';

const {registerTypes} = require('./types');
const ApiConsumer = require('../utils/api-consumer');
const {DataDotGovKey} = require('../utils/api-key');
const Crime = new ApiConsumer('FBICrimeData', 'https://api.usa.gov/crime/fbi/sapi/', {cache: {ttl: 24*60*60}});
ApiConsumer.setRequiredApiKey(Crime, DataDotGovKey);
registerTypes();

function assertValidYearRange(startYear, endYear) {
    if (endYear < startYear) {  // TODO: can these be equal?
        throw Error('End year should not be less than start year.');
    }
}

/** 
 * Get the number of offenses for a specific instance
 * @param {OffenseData} offense the type of breach of a law or rule
 * @param {OffenseDataOpt} category variable affecting crimes including examples: count, weapons, etc. 
 * @returns {Object} data related to national offense count
 */
Crime.nationalOffenseCount = async function (offense,category) {
    return await this._requestData({path:`api/data/nibrs/${offense}/offense/national/${category}`, queryString:`api_key=${this.apiKey.value}`});
};

/**
 * Get the number of offenses for a specific region
 * @param {OffenseData} offense the type of breach of a law or rule
 * @param {String} regionName indicates in which region the crime has occurred
 * @param {OffenseDataOpt} category variable affecting crimes including examples: count, weapons, etc.
 * @returns {Object} data related to the regional offense count
 */
Crime.regionalOffenseCount = async function (offense,regionName, category) {
    return await this._requestData({path:`api/data/nibrs/${offense}/offense/regions/${regionName}/${category}`, queryString:`api_key=${this.apiKey.value}`});
};

/**
 * Get the number of offenses for a specific region
 * @param {OffenseData} offense the type of breach of a law or rule
 * @param {String} stateAbbr location of the crime in which state
 * @param {OffenseDataOpt} variable variable affecting crimes including examples: count, weapons, etc
 * @returns {Object} data related to the state offense count
 */
Crime.stateOffenseCount = async function (offense, stateAbbr, variable) {
    return await this._requestData({path:`api/data/nibrs/${offense}/offense/states/${stateAbbr}/${variable}`, queryString:`api_key=${this.apiKey.value}`});
};

/**
 * Get the number of supplemental offenses nationwise
 * @param {OffenseSupplemental} offense the type of breach of a law or rule
 * @param {SuppDataOpt} category variable affecting crimes including examples: count, weapons, etc.
 * @param {BoundedInteger<1985, 2019>} startYear beginning year
 * @param {BoundedInteger<1985, 2019>} endYear ending year
 * @returns {Object} data related to national supplemental count
 */
Crime.nationalSupplementalCount = async function (offense, category, startYear, endYear) {
    assertValidYearRange(startYear, endYear);
    return await this._requestData({path:`api/data/supplemental/${offense}/national/${category}/${startYear}/${endYear}`, queryString:`api_key=${this.apiKey.value}`});
};

/**
 * Get the number of supplemental offenses for a state
 * @param {OffenseSupplemental} offense the type of breach of a law or rule
 * @param {String} stateAbbr location of the crime in a state
 * @param {SuppDataOpt>} category variable affecting crimes including examples: count, weapons, etc.
 * @param {BoundedInteger<1985, 2019>} startYear beginning year
 * @param {BoundedInteger<1985, 2019>} endYear ending year
 * @returns {Object} data related to state supplemental count
 */
Crime.stateSupplementalCount = async function (offense, stateAbbr, category, startYear, endYear) {
    assertValidYearRange(startYear, endYear);
    return await this._requestData({path:`api/data/supplemental/${offense}/states/${stateAbbr}/${category}/${startYear}/${endYear}`, queryString:`api_key=${this.apiKey.value}`});
};

/**
 * Get the number of arrests for the nation in a certain time period
 * @param {OffenseArrest} offense the type of breach of a law or rule
 * @param {Enum<male,female,offense,race,monthly>} category variable that describes the individual who committed the crime
 * @param {BoundedInteger<1985, 2019>} startYear beginning year
 * @param {BoundedInteger<1985, 2019>} endYear ending year
 * @returns {Object} data related to national arrest count
 */
Crime.nationalArrestCount = async function (offense, category, startYear, endYear) {
    assertValidYearRange(startYear, endYear);
    return await this._requestData({path:`api/arrest/national/${offense}/${category}/${startYear}/${endYear}`, queryString:`api_key=${this.apiKey.value}`});
};

/**
 * Get the number of arrests for the nation in a certain time period
 * @param {String} regionName location of the region the crime occurred
 * @param {OffenseArrest} offense the type of breach of a law or rule
 * @param {Enum<male,female,offense,race,monthly>} category variable that describes the individual who committed the crime
 * @param {BoundedInteger<1985, 2019>} startYear beginning year
 * @param {BoundedInteger<1985, 2019>} endYear ending year
 * @returns {Object} data related to region arrest count
 */
Crime.regionArrestCount = async function (regionName, offense, category, startYear, endYear) {
    assertValidYearRange(startYear, endYear);
    return await this._requestData({path:`api/arrest/regions/${regionName}/${offense}/${category}/${startYear}/${endYear}`, queryString:`api_key=${this.apiKey.value}`});
};

/**
 * Get the number of arrests(for a particular offense) for the state in a certain time period
 * @param {String} stateAbbr location of the state the crime occurred
 * @param {Enum<male,female,offense,race,monthly>} category variable that describes the individual who committed the crime
 * @param {BoundedInteger<1985, 2019>} startYear beginning year
 * @param {BoundedInteger<1985, 2019>} endYear ending year
 * @returns {Object} data related to state arrest count
 */
Crime.stateArrestCount = async function (stateAbbr, category, startYear, endYear) {
    assertValidYearRange(startYear, endYear);
    return await this._requestData({path:`api/arrest/states/offense/${stateAbbr}/${category}/${startYear}/${endYear}`, queryString:`api_key=${this.apiKey.value}`});
};

/**
 * Get the number of victims for the nation based on the offense and variable
 * @param {OffenseVictim} offense the type of breach of a law or rule
 * @param {Enum<age,count,ethnicity,race,sex,relationship>} category variable that describes the individual who committed the crime
 * @returns {Object} data related to national victim count
 */
Crime.nationalVictimCount = async function (offense, category) {
    return await this._requestData({path:`api/nibrs/${offense}/victim/national/${category}`, queryString:`api_key=${this.apiKey.value}`});
};

/**
 * Get the number of victims for the nation based on the offense and variable
 * @param {OffenseVictim} offense the type of breach of a law or rule
 * @param {String} regionName location of the region the crime occurred
 * @param {Enum<age,count,ethnicity,race,sex,relationship>} category variable that describes the individual who committed the crime
 * @returns {Object} data related to regional victim count
 */
Crime.regionalVictimCount = async function (offense, regionName, category) {
    return await this._requestData({path:`api/nibrs/${offense}/victim/regions/${regionName}/${category}`, queryString:`api_key=${this.apiKey.value}`});
};

/**
 * Get the number of victims for the nation based on the offense and variable
 * @param {OffenseVictim} offense the type of breach of a law or rule
 * @param {String} stateAbbr state the crime occurred
 * @param {Enum<age,count,ethnicity,race,sex,relationship>} category variable that describes the individual who committed the crime
 * @returns {Object} data related to state victim count
 */
Crime.stateVictimCount = async function (offense, stateAbbr, category) {
    return await this._requestData({path:`api/nibrs/${offense}/victim/states/${stateAbbr}/${category}`, queryString:`api_key=${this.apiKey.value}`});
};

module.exports = Crime;

/**
 * The FBICrimeData Service provides access to the FBI database,
 * containing catalogued information on millions of historical items.
 * 
 * @alpha
 * @service
 * @category Science
 */
'use strict';

const ApiConsumer = require('../utils/api-consumer');
const {DataDotGovKey} = require('../utils/api-key');
const Crime = new ApiConsumer('FBI-Crime-Data', 'https://api.usa.gov/crime/fbi/sapi/', {cache: {ttl: 5*60}});
ApiConsumer.setRequiredApiKey(Crime, DataDotGovKey);


/** 
 * National Offense Count- returns the number of offenses for a specific instance
 * @param {String} offense target address
 * @param {String} variable target address
 * @returns {Any} structured data representing the location of the address
 */
Crime.national_offense_count = async function (offense,variable) {
    const data = await this._requestData({path:`api/data/nibrs/${offense}/offense/national/${variable}`, queryString:`api_key=${this.apiKey.value}`});
    return data;
};

/**
 * Regional Level Offense Count- returns the number of offenses for a specific region
 * @param {String} offense target address
 * @param {String} regionName target address
 * @param {String} variable target address
 * @returns {Any} structured data representing the location of the address
 */
Crime.regional_offense_count = async function (offense,regionName, variable) {
    const data = await this._requestData({path:`api/data/nibrs/${offense}/offense/regions/${regionName}/${variable}`, queryString:`api_key=${this.apiKey.value}`});
    return data;
};

/**
 * State Level Offense Count- returns the number of offenses for a specific region
 * @param {String} offense target address
 * @param {String} stateAbbr target address
 * @param {String} variable target address
 * @returns {Any} structured data representing the location of the address
 */
Crime.state_offense_count = async function (offense, stateAbbr, variable) {
    const data = await this._requestData({path:`api/data/nibrs/${offense}/offense/states/${stateAbbr}/${variable}`, queryString:`api_key=${this.apiKey.value}`});
    return data;
};

/**
 * National Level Supplemental Count- returns the number of supplemental offenses nationwise
 * @param {String} offense target address
 * @param {String} variable target address
 * @param {Number} since target address
 * @param {Number} until target address
 * @returns {Any} structured data representing the location of the address
 */
Crime.national_supplemental_count = async function (offense, variable, since, until) {
    const data = await this._requestData({path:`api/data/supplemental/${offense}/national/${variable}/${since}/${until}`, queryString:`api_key=${this.apiKey.value}`});
    return data;
};

/**
 * State Level Supplemental Count- returns the number of supplemental offenses for a state
 * @param {String} offense target address
 * @param {String} stateAbbr target address
 * @param {String} variable target address
 * @param {Number} since target address
 * @param {Number} until target address
 * @returns {Any} structured data representing the location of the address
 */
Crime.state_supplemental_count = async function (offense, stateAbbr, variable, since, until) {
    const data = await this._requestData({path:`api/data/supplemental/${offense}/states/${stateAbbr}/${variable}/${since}/${until}`, queryString:`api_key=${this.apiKey.value}`});
    return data;
};

/**
 * National arrest Count- returns the number of arrests for the nation in a certain time period
 * @param {String} offense target address
 * @param {String} variable target address
 * @param {Number} since target address
 * @param {Number} until target address
 * @returns {Any} structured data representing the location of the address
 */
Crime.national_arrest_count = async function (offense, variable, since, until) {
    const data = await this._requestData({path:`api/arrest/national/${offense}/${variable}/${since}/${until}`, queryString:`api_key=${this.apiKey.value}`});
    return data;
};

/**
 * Regional Name arrest Count- returns the number of arrests for the nation in a certain time period
 * @param {String} regionName target address
 * @param {String} offense target address
 * @param {String} variable target address
 * @param {Number} since target address
 * @param {Number} until target address
 * @returns {Any} structured data representing the location of the address
 */
Crime.region_arrest_count = async function (regionName, offense, variable, since, until) {
    const data = await this._requestData({path:`api/arrest/national/${regionName}/${offense}/${variable}/${since}/${until}`, queryString:`api_key=${this.apiKey.value}`});
    return data;
};

/**
 * State Name arrest Count- returns the number of arrests(for a particular offense) for the state in a certain time period
 * @param {String} stateAbbr target address
 * @param {String} variable target address
 * @param {Number} since target address
 * @param {Number} until target address
 * @returns {Any} structured data representing the location of the address
 */
Crime.state_arrest_count = async function (stateAbbr, variable, since, until) {
    const data = await this._requestData({path:`api/arrest/national/${stateAbbr}/${variable}/${since}/${until}`, queryString:`api_key=${this.apiKey.value}`});
    return data;
};

/**
 * National victim Count- returns the number of victims for the nation based on the offense and variable
 * @param {String} offense target address
 * @param {String} variable target address
 * @returns {Any} structured data representing the location of the address
 */
Crime.national_victim_count = async function (offense, variable) {
    const data = await this._requestData({path:`api/nibrs/${offense}/victim/national/${variable}`, queryString:`api_key=${this.apiKey.value}`});
    return data;
};

/**
 * Regional victim Count- returns the number of victims for the nation based on the offense and variable
 * @param {String} offense target address
 * @param {String} regionName target address
 * @param {String} variable target address
 * @returns {Any} structured data representing the location of the address
 */
Crime.regional_victim_count = async function (offense, regionName, variable) {
    const data = await this._requestData({path:`api/nibrs/${offense}/victim/regions/${regionName}/${variable}`, queryString:`api_key=${this.apiKey.value}`});
    return data;
};
module.exports=Crime;
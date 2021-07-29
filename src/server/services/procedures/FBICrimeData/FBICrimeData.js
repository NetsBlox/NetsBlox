/**
 * The FBICrimeData Service provides access to the FBI database,
 * containing catalogued information on crime statistics.
 * 
 * @alpha
 * @service
 * @category Science
 */
'use strict';

const types = require('../../input-types');
const OFFENSE_Data_Controller_OPTIONS = ['aggravated-assault','all-other-larceny','all-other-offenses','animal-cruelty','arson','assisting-or-promoting-prostitution','bad-checks','betting','bribery','burglary-breaking-and-entering','counterfeiting-forgery','credit-card-automated-teller-machine-fraud','destruction-damage-vandalism-of-property','driving-under-the-influence','drug-equipment-violations','drug-violations','drunkenness','embezzlement','extortion-blackmail','false-pretenses-swindle-confidence-game','fondling','gambling-equipment-violation','hacking-computer-invasion','human-trafficking-commerical-sex-acts','human-trafficking-commerical-involuntary-servitude','identity-theft','impersonation','incest','intimidation','justifiable-homicide','kidnapping-abduction','motor-vehicle-theft','murder-and-nonnegligent-manslaughter','negligent-manslaughter','operating-promoting-assiting-gambling','curfew-loitering-vagrancy-violations','peeping-tom','pocket-picking','pornography-obscence-material','prostitution','purchasing-prostitution','purse-snatching','rape','robbery','sexual-assult-with-an-object','sex-offenses-non-forcible','shoplifting','simple-assault','sodomy','sports-tampering','statutory-rape','stolen-property-offenses','theft-from-building','theft-from-coin-operated-machine-or-device','theft-from-motor-vehicle','theft-of-motor-vehicle-parts-or-accessories','theft-from-motor-vehicle','weapon-law-violation','welfare-fraud','wire-fraud','not-specified','liquor-law-violations','crime-against-person','crime-against-property','crime-against-society','assault-offenses','homicide-offenses','human-trafficking-offenses','sex-offenses','sex-offenses-non-forcible', 'fraud-offenses','larceny-theft-offenses', 'drugs-narcotic-offenses','gambling-offenses','prostitution-offenses','all-offenses'];
const OffenseData = input => types.parse.Enum(input, OFFENSE_Data_Controller_OPTIONS, undefined, 'OffenseData');
types.defineType('OffenseData', OffenseData);

const OFFENSE_Supp_Controller_OPTIONS = ['burglary','robbery','not-specified','motor-vehicle-theft','larceny'];
const OffenseSupplemental = input => types.parse.Enum(input, OFFENSE_Supp_Controller_OPTIONS, undefined, 'OffenseSupplemental');
types.defineType('OffenseSupplemental', OffenseSupplemental);

const OFFENSE_Arrest_Controller_OPTIONS = ['aggravated-assault','all-other-offenses','arson','burglary','curfew','disorderly-conduct','dui','drug-grand-total','drug-possession-marijuana','drug-possession-opium','drug-possession-other','drug-possession-subtotal','drug-possession-synthetic','drug-sales-marijuana','drug-sales-opium','drug-sales-other','drug-sales-subtotal','drug-sales-synthetic','drunkenness','embezzlement','forgery','fraud','gambling-all-other','gambling-bookmaking','gambling-numbers','gambling-total','human-trafficking-commerical','human-trafficking-servitude','larceny','liqour-laws','motor-vehcile-theft','murder','offense-against-family','prostitution','prostitution-assisting','prostitution-prostitution','prostitution-purchasing','rape','robbery','runaway','sex-offenses','simple-assault','stolen-property','suspicion','vagrancy','vandalism','weapons'];
const OffenseArrest = input => types.parse.Enum(input, OFFENSE_Arrest_Controller_OPTIONS, undefined, 'OffenseArrest');
types.defineType('OffenseArrest', OffenseArrest);

const OFFENSE_Victim_Controller_OPTIONS = ['aggravated-assault','burglary','larceny','motor-vehicle-theft','homicide','rape','robbery','arson','violent-crime','property-crime'];
const OffenseVictim = input => types.parse.Enum(input, OFFENSE_Victim_Controller_OPTIONS, undefined, 'OffenseVictim');
types.defineType('OffenseVictim', OffenseVictim);

const ApiConsumer = require('../utils/api-consumer');
const {DataDotGovKey} = require('../utils/api-key');
const Crime = new ApiConsumer('FBI-Crime-Data', 'https://api.usa.gov/crime/fbi/sapi/', {cache: {ttl: 24*60*60}});
ApiConsumer.setRequiredApiKey(Crime, DataDotGovKey);

/** 
 * Gets the number of offenses for a specific instance
 * @param {OffenseData} offense the type of breach of a law or rule
 * @param {Enum<COUNT,WEAPONS,LINKEDOFFENSE,SUSPECTUSING,CRIMINAL_ACTIVITY,PROPERTY_RECOVERED,PROPERTY_STOLEN,BIAS>} variable variable affecting crimes including examples: count, weapons, etc. 
 * @returns {Object} structured data representing the location of the address
 */
Crime.nationalOffenseCount = async function (offense,variable) {
    return await this._requestData({path:`api/data/nibrs/${offense}/offense/national/${variable}`, queryString:`api_key=${this.apiKey.value}`});
};

/**
 * Gets the number of offenses for a specific region
 * @param {OffenseData} offense the type of breach of a law or rule
 * @param {String} regionName indicates in which region the crime has occurred
 * @param {Enum<COUNT,WEAPONS,LINKEDOFFENSE,SUSPECTUSING,CRIMINAL_ACTIVITY,PROPERTY_RECOVERED,PROPERTY_STOLEN,BIAS>} variable variable affecting crimes including examples: count, weapons, etc.
 * @returns {Object} structured data representing the location of the address
 */
Crime.regionalOffenseCount = async function (offense,regionName, variable) {
    return await this._requestData({path:`api/data/nibrs/${offense}/offense/regions/${regionName}/${variable}`, queryString:`api_key=${this.apiKey.value}`});
};

/**
 * Gets the number of offenses for a specific region
 * @param {OffenseData} offense the type of breach of a law or rule
 * @param {String} stateAbbr location of the crime in which state
 * @param {Enum<COUNT,WEAPONS,LINKEDOFFENSE,SUSPECTUSING,CRIMINAL_ACTIVITY,PROPERTY_RECOVERED,PROPERTY_STOLEN,BIAS>} variable variable affecting crimes including examples: count, weapons, etc
 * @returns {Object} structured data representing the location of the address
 */
Crime.stateOffenseCount = async function (offense, stateAbbr, variable) {
    return await this._requestData({path:`api/data/nibrs/${offense}/offense/states/${stateAbbr}/${variable}`, queryString:`api_key=${this.apiKey.value}`});
};

/**
 * Gets the number of supplemental offenses nationwise
 * @param {OffenseSupplemental} offense the type of breach of a law or rule
 * @param {Enum<'MVT_RECOVERED','OFFENSE','OFFENSE_SUB_CATEGORY','LARCENY_TYPE'>} variable variable affecting crimes including examples: count, weapons, etc.
 * @param {Number} startYear beginning year
 * @param {Number} endYear ending year
 * @returns {Object} structured data representing the location of the address
 */
Crime.nationalSupplementalCount = async function (offense, variable, since, until) {
    return await this._requestData({path:`api/data/supplemental/${offense}/national/${variable}/${since}/${until}`, queryString:`api_key=${this.apiKey.value}`});
};

/**
 * Gets the number of supplemental offenses for a state
 * @param {OffenseSupplemental} offense the type of breach of a law or rule
 * @param {String} stateAbbr location of the crime in a state
 * @param {Enum<'MVT_RECOVERED','OFFENSE','OFFENSE_SUB_CATEGORY','LARCENY_TYPE'>} variable variable affecting crimes including examples: count, weapons, etc.
 * @param {Number} startYear beginning year
 * @param {Number} endYear ending year
 * @returns {Object} structured data representing the location of the address
 */
Crime.stateSupplementalCount = async function (offense, stateAbbr, variable, since, until) {
    return await this._requestData({path:`api/data/supplemental/${offense}/states/${stateAbbr}/${variable}/${since}/${until}`, queryString:`api_key=${this.apiKey.value}`});
};

/**
 * Gets the number of arrests for the nation in a certain time period
 * @param {OffenseArrest} offense the type of breach of a law or rule
 * @param {Enum<male,female,offense,race,monthly>} variable variable affecting crimes including examples: count, weapons, etc.
 * @param {Number} since beginning year
 * @param {Number} until ending year
 * @returns {Object} structured data representing the location of the address
 */
Crime.nationalArrestCount = async function (offense, variable, since, until) {
    return await this._requestData({path:`api/arrest/national/${offense}/${variable}/${since}/${until}`, queryString:`api_key=${this.apiKey.value}`});
};

/**
 * Gets the number of arrests for the nation in a certain time period
 * @param {String} regionName location of the region the crime occurred
 * @param {OffenseArrest} offense the type of breach of a law or rule
 * @param {Enum<male,female,offense,race,monthly>} variable variable affecting crimes including examples: count, weapons, etc.
 * @param {Number} since beginning year
 * @param {Number} until ending year
 * @returns {Object} structured data representing the location of the address
 */
Crime.regionArrestCount = async function (regionName, offense, variable, since, until) {
    return await this._requestData({path:`api/arrest/regions/${regionName}/${offense}/${variable}/${since}/${until}`, queryString:`api_key=${this.apiKey.value}`});
};

/**
 * Gets the number of arrests(for a particular offense) for the state in a certain time period
 * @param {String} stateAbbr location of the state the crime occurred
 * @param {Enum<violent_crime,propery_crime,drug,human_trafficking,gambling,juvenile,society,all>} variable variable affecting crimes including examples: count, weapons, etc.
 * @param {Number} startYear beginning year
 * @param {Number} endYear ending year
 * @returns {Object} structured data representing the location of the address
 */
Crime.stateArrestCount = async function (stateAbbr, variable, since, until) {
    return await this._requestData({path:`api/arrest/states/offense/${stateAbbr}/${variable}/${since}/${until}`, queryString:`api_key=${this.apiKey.value}`});
};

/**
 * Gets the number of victims for the nation based on the offense and variable
 * @param {OffenseVictim} offense the type of breach of a law or rule
 * @param {Enum<age,count,ethnicity,race,sex,relationship>} variable variable affecting crimes including examples: count, weapons, etc.
 * @returns {Object} structured data representing the location of the address
 */
Crime.nationalVictimCount = async function (offense, variable) {
    return await this._requestData({path:`api/nibrs/${offense}/victim/national/${variable}`, queryString:`api_key=${this.apiKey.value}`});

};

/**
 * Gets the number of victims for the nation based on the offense and variable
 * @param {OffenseVictim} offense the type of breach of a law or rule
 * @param {String} regionName location of the region the crime occurred
 * @param {Enum<age,count,ethnicity,race,sex,relationship>} variable variable affecting crimes including examples: count, weapons, etc.
 * @returns {Object} structured data representing the location of the address
 */
Crime.regionalVictimCount = async function (offense, regionName, variable) {
    return await this._requestData({path:`api/nibrs/${offense}/victim/regions/${regionName}/${variable}`, queryString:`api_key=${this.apiKey.value}`});
};

/**
 * Gets the number of victims for the nation based on the offense and variable
 * @param {OffenseVictim} offense the type of breach of a law or rule
 * @param {String} stateAbbr state the crime occurred
 * @param {Enum<age,count,ethnicity,race,sex,relationship>} variable variable affecting crimes including examples: count, weapons, etc.
 * @returns {Object} structured data representing the location of the address
 */
 Crime.stateVictimCount = async function (offense, stateAbbr, variable) {
    return await this._requestData({path:`api/nibrs/${offense}/victim/states/${stateAbbr}/${variable}`, queryString:`api_key=${this.apiKey.value}`});
};

module.exports = Crime;
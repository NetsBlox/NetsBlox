/**
 * The FBICrimeData Service provides access to the FBI database,
 * containing catalogued information on crime statistics.
 * 
 * @alpha
 * @service
 * @category Statistics
 */
'use strict';

const types = require('../../input-types');

const OFFENSE_Data_Controller_OPTIONS = {
    'aggravated-assault': 'aggravated-assault',
    'all other larceny': 'all-other-larceny',
    'all other offenses': 'all-other-offenses',
    'animal cruelty': 'animal-cruelty',
    'arson': 'arson',
    'assisting or promoting prostitution': 'assisting-or-promoting-prostitution',
    'bad checks': 'bad-checks',
    'betting': 'betting',
    'bribery': 'bribery',
    'burglary breaking and entering': 'burglary-breaking-and-entering',
    'counterfeiting forgery': 'counterfeiting-forgery',
    'credit card automated teller machine fraud': 'credit-card-automated-teller-machine-fraud',
    'destruction damage vandalism of property': 'destruction-damage-vandalism-of-property',
    'driving under the influence': 'driving-under-the-influence',
    'drug equipment violations': 'drug-equipment-violations',
    'drug violations': 'drug-violations',
    'drunkenness': 'drunkenness',
    'embezzlement': 'embezzlement',
    'extortion blackmail': 'extortion-blackmail',
    'false pretenses swindle confidence game': 'false-pretenses-swindle-confidence-game',
    'fondling': 'fondling',
    'gambling equipment violation': 'gambling-equipment-violation',
    'hacking computer invasion': 'hacking-computer-invasion',
    'human trafficking commerical sex acts': 'human-trafficking-commerical-sex-acts',
    'human trafficking commerical involuntary servitude': 'human-trafficking-commerical-involuntary-servitude',
    'identity theft': 'identity-theft',
    'impersonation': 'impersonation',
    'incest': 'incest',
    'intimidation': 'intimidation',
    'justifiable homicide': 'justifiable-homicide',
    'kidnapping abduction': 'kidnapping-abduction',
    'motor vehicle theft': 'motor-vehicle-theft',
    'murder and nonnegligent manslaughter': 'murder-and-nonnegligent-manslaughter',
    'negligent manslaughter': 'negligent-manslaughter',
    'operating promoting assiting gambling': 'operating-promoting-assiting-gambling',
    'curfew loitering vagrancy violations': 'curfew-loitering-vagrancy-violations',
    'peeping tom': 'peeping-tom',
    'pocket picking': 'pocket-picking',
    'pornography obscence material': 'pornography-obscence-material',
    'prostitution': 'prostitution',
    'purchasing prostitution': 'purchasing-prostitution',
    'purse snatching': 'purse-snatching',
    'rape': 'rape',
    'robbery': 'robbery',
    'sexual assult with an object': 'sexual-assult-with-an-object',
    'sex offenses non forcible': 'sex-offenses-non-forcible',
    'shoplifting': 'shoplifting',
    'simple assault': 'simple-assault',
    'sodomy': 'sodomy',
    'sports tampering': 'sports-tampering',
    'statutory rape': 'statutory-rape',
    'stolen property offenses': 'stolen-property-offenses',
    'theft from building': 'theft-from-building',
    'theft from coin operated machine or device': 'theft-from-coin-operated-machine-or-device',
    'theft from motor vehicle': 'theft-from-motor-vehicle',
    'theft of motor vehicle-parts or accessories': 'theft-of-motor-vehicle-parts-or-accessories',
    'theft from motor vehicle': 'theft-from-motor-vehicle',
    'weapon law violation': 'weapon-law-violation',
    'welfare fraud': 'welfare-fraud',
    'wire fraud': 'wire-fraud',
    'not specified': 'not-specified',
    'liquor law violations': 'liquor-law-violations',
    'crime against person': 'crime-against-person',
    'crime against property': 'crime-against-property',
    'crime against society': 'crime-against-society',
    'assault offenses': 'assault-offenses',
    'homicide offenses': 'homicide-offenses',
    'human trafficking offenses': 'human-trafficking-offenses',
    'sex offenses': 'sex-offenses',
    'sex offenses non forcible': 'sex-offenses-non-forcible',
    'fraud offenses': 'fraud-offenses',
    'larceny theft offenses': 'larceny-theft-offenses',
    'drugs narcotic offenses': 'drugs-narcotic-offenses',
    'gambling offenses': 'gambling-offenses',
    'prostitution offenses': 'prostitution-offenses',
    'all offenses': 'all-offenses',
};

types.defineType({
    name: 'OffenseData',
    description: 'Type of information to get offense.',
    baseType: 'Enum',
    baseParams: OFFENSE_Data_Controller_OPTIONS,
});

const OFFENSE_Supp_Controller_OPTIONS = {
    'burglary': 'burglary',
    'robbery': 'robbery',
    'not specified': 'not-specified',
    'motor vehicle theft': 'motor-vehicle-theft',
    'larceny': 'larceny'
};

types.defineType({
    name: 'OffenseSupplemental',
    description: 'Type of information to get offense.',
    baseType: 'Enum',
    baseParams: OFFENSE_Supp_Controller_OPTIONS,
});

const OFFENSE_Arrest_Controller_OPTIONS = {
    'aggravated assault': 'aggravated-assault', 
    'all other offenses': 'all-other-offenses',
    'arson': 'arson',
    'burglary':'burglary',
    'curfew': 'curfew',
    'disorderly conduct': 'disorderly-conduct',
    'dui':'dui',
    'drug grand total': 'drug-grand-total',
    'drug possession marijuana': 'drug-possession-marijuana',
    'drug possession opium': 'drug-possession-opium',
    'drug possession other': 'drug-possession-other',
    'drug possession subtotal': 'drug-possession-subtotal',
    'drug possession synthetic': 'drug-possession-synthetic',
    'drug sales marijuana': 'drug-sales-marijuana',
    'drug sales opium':'drug-sales-opium',
    'drug sales other': 'drug-sales-other',
    'drug sales subtotal': 'drug-sales-subtotal',
    'drug sales synthetic': 'drug-sales-synthetic',
    'drunkenness': 'drunkenness',
    'embezzlement': 'embezzlement',
    'forgery': 'forgery',
    'fraud': 'fraud',
    'gambling all other': 'gambling-all-other',
    'gambling bookmaking': 'gambling-bookmaking',
    'gambling numbers': 'gambling-numbers',
    'gambling total':'gambling-total',
    'human trafficking commerical':'human-trafficking-commerical',
    'human trafficking servitude':'human-trafficking-servitude',
    'larceny':'larceny',
    'liqour laws':'liqour-laws',
    'motor vehcile theft':'motor-vehcile-theft',
    'murder':'murder',
    'offense against family':'offense-against-family',
    'prostitution':'prostitution',
    'prostitution assisting':'prostitution-assisting',
    'prostitution prostitution':'prostitution-prostitution',
    'prostitution purchasing':'prostitution-purchasing',
    'rape':'rape',
    'robbery':'robbery',
    'runaway':'runaway',
    'sexoffenses':'sex-offenses',
    'simple assault':'simple-assault',
    'stolen property':'stolen-property',
    'suspicion':'suspicion',
    'vagrancy':'vagrancy',
    'vandalism':'vandalism',
    'weapons':'weapons'
};

types.defineType({
    name: 'OffenseArrest',
    description: 'Type of information to get offense.',
    baseType: 'Enum',
    baseParams: OFFENSE_Arrest_Controller_OPTIONS,
});

const OFFENSE_Victim_Controller_OPTIONS = {
    'aggravated assault': 'aggravated-assault',
    'burglary': 'burglary',
    'larceny': 'larceny',
    'motor vehicle theft': 'motor-vehicle-theft',
    'homicide': 'homicide',
    'rape': 'rape',
    'robbery': 'robbery',
    'arson': 'arson',
    'violent crime': 'violent-crime',
    'property crime':'property-crime'
};

types.defineType({
    name: 'OffenseVictim',
    description: 'Type of information to get offense.',
    baseType: 'Enum',
    baseParams: OFFENSE_Victim_Controller_OPTIONS,
});

const OFFENSE_Data_Variable_OPTIONS={
    'count':'COUNT',
    'weapons':'WEAPONS',
    'linked offense':'LINKEDOFFENSE',
    'suspect using':'SUSPECTUSING',
    'criminal activity':'CRIMINAL_ACTIVITY',
    'property recovered':'PROPERTY_RECOVERED',
    'property stolen':'PROPERTY_STOLEN',
    'bias':'BIAS'
};

types.defineType({
    name: 'OffenseDataOpt',
    description: 'Type of information to get offense.',
    baseType: 'Enum',
    baseParams: OFFENSE_Data_Variable_OPTIONS,
});

const ApiConsumer = require('../utils/api-consumer');
const {DataDotGovKey} = require('../utils/api-key');
const Crime = new ApiConsumer('FBICrimeData', 'https://api.usa.gov/crime/fbi/sapi/', {cache: {ttl: 24*60*60}});
ApiConsumer.setRequiredApiKey(Crime, DataDotGovKey);

/** 
 * Gets the number of offenses for a specific instance
 * @param {OffenseData} offense the type of breach of a law or rule
 * @param {OffenseDataOpt}category variable affecting crimes including examples: count, weapons, etc. 
 * @returns {Object} structured data representing the location of the address
 */
Crime.nationalOffenseCount = async function (offense,category) {
    return await this._requestData({path:`api/data/nibrs/${offense}/offense/national/${category}`, queryString:`api_key=${this.apiKey.value}`});
};

/**
 * Gets the number of offenses for a specific region
 * @param {OffenseData} offense the type of breach of a law or rule
 * @param {String} regionName indicates in which region the crime has occurred
 * @param {OffenseDataOpt} category variable affecting crimes including examples: count, weapons, etc.
 * @returns {Object} structured data representing the location of the address
 */
Crime.regionalOffenseCount = async function (offense,regionName, category) {
    return await this._requestData({path:`api/data/nibrs/${offense}/offense/regions/${regionName}/${category}`, queryString:`api_key=${this.apiKey.value}`});
};

/**
 * Gets the number of offenses for a specific region
 * @param {OffenseData} offense the type of breach of a law or rule
 * @param {String} stateAbbr location of the crime in which state
 * @param {OffenseDataOpt} variable variable affecting crimes including examples: count, weapons, etc
 * @returns {Object} structured data representing the location of the address
 */
Crime.stateOffenseCount = async function (offense, stateAbbr, variable) {
    return await this._requestData({path:`api/data/nibrs/${offense}/offense/states/${stateAbbr}/${variable}`, queryString:`api_key=${this.apiKey.value}`});
};

/**
 * Gets the number of supplemental offenses nationwise
 * @param {OffenseSupplemental} offense the type of breach of a law or rule
 * @param {Enum<'MVT_RECOVERED','OFFENSE','OFFENSE_SUB_CATEGORY','LARCENY_TYPE'>} category variable affecting crimes including examples: count, weapons, etc.
 * @param {BoundedInteger<1985, 2019>} startYear beginning year
 * @param {BoundedInteger<1985, 2019>} endYear ending year
 * @returns {Object} structured data representing the location of the address
 */
Crime.nationalSupplementalCount = async function (offense, category, startYear, endYear) {
    if (endYear<=startYear) {
        throw Error('End year should not be less than Start year');
    } else {
        return await this._requestData({path:`api/data/supplemental/${offense}/national/${category}/${startYear}/${endYear}`, queryString:`api_key=${this.apiKey.value}`});
    }
};

/**
 * Gets the number of supplemental offenses for a state
 * @param {OffenseSupplemental} offense the type of breach of a law or rule
 * @param {String} stateAbbr location of the crime in a state
 * @param {Enum<'MVT_RECOVERED','OFFENSE','OFFENSE_SUB_CATEGORY','LARCENY_TYPE'>} category variable affecting crimes including examples: count, weapons, etc.
 * @param {BoundedInteger<1985, 2019>} startYear beginning year
 * @param {BoundedInteger<1985, 2019>} endYear ending year
 * @returns {Object} structured data representing the location of the address
 */
Crime.stateSupplementalCount = async function (offense, stateAbbr, category, startYear, endYear) {
    if (endYear<=startYear) {
        throw Error('End year should not be less than or equal to Start year');
    } 
    else {
        return await this._requestData({path:`api/data/supplemental/${offense}/states/${stateAbbr}/${category}/${startYear}/${endYear}`, queryString:`api_key=${this.apiKey.value}`});
    }
};

/**
 * Gets the number of arrests for the nation in a certain time period
 * @param {OffenseArrest} offense the type of breach of a law or rule
 * @param {Enum<male,female,offense,race,monthly>} category variable affecting crimes including examples: count, weapons, etc.
 * @param {BoundedInteger<1985, 2019>} startYear beginning year
 * @param {BoundedInteger<1985, 2019>} endYear ending year
 * @returns {Object} structured data representing the location of the address
 */
Crime.nationalArrestCount = async function (offense, category, startYear, endYear) {
    if (endYear<=startYear) {
        throw Error('End year should not be less than or equal to Start year');
    } 
    else {
        return await this._requestData({path:`api/arrest/national/${offense}/${category}/${startYear}/${endYear}`, queryString:`api_key=${this.apiKey.value}`});
    }
};

/**
 * Gets the number of arrests for the nation in a certain time period
 * @param {String} regionName location of the region the crime occurred
 * @param {OffenseArrest} offense the type of breach of a law or rule
 * @param {Enum<male,female,offense,race,monthly>} category variable affecting crimes including examples: count, weapons, etc.
 * @param {BoundedInteger<1985, 2019>} startYear beginning year
 * @param {BoundedInteger<1985, 2019>} endYear ending year
 * @returns {Object} structured data representing the location of the address
 */
Crime.regionArrestCount = async function (regionName, offense, category, startYear, endYear) {
    if (endYear<=startYear) {
        throw Error('End year should not be less than or equal to Start year');
    } 
    else {
        return await this._requestData({path:`api/arrest/regions/${regionName}/${offense}/${category}/${startYear}/${endYear}`, queryString:`api_key=${this.apiKey.value}`});
    }
};

/**
 * Gets the number of arrests(for a particular offense) for the state in a certain time period
 * @param {String} stateAbbr location of the state the crime occurred
 * @param {Enum<violent_crime,propery_crime,drug,human_trafficking,gambling,juvenile,society,all>} category variable affecting crimes including examples: count, weapons, etc.
 * @param {BoundedInteger<1985, 2019>} startYear beginning year
 * @param {BoundedInteger<1985, 2019>} endYear ending year
 * @returns {Object} structured data representing the location of the address
 */
Crime.stateArrestCount = async function (stateAbbr, category, startYear, endYear) {
    if (endYear<=startYear) {
        throw Error('End year should not be less than or equal to Start year');
    } 
    else {
        return await this._requestData({path:`api/arrest/states/offense/${stateAbbr}/${category}/${startYear}/${endYear}`, queryString:`api_key=${this.apiKey.value}`});
    }
};

/**
 * Gets the number of victims for the nation based on the offense and variable
 * @param {OffenseVictim} offense the type of breach of a law or rule
 * @param {Enum<age,count,ethnicity,race,sex,relationship>} category variable affecting crimes including examples: count, weapons, etc.
 * @returns {Object} structured data representing the location of the address
 */
Crime.nationalVictimCount = async function (offense, category) {
    return await this._requestData({path:`api/nibrs/${offense}/victim/national/${category}`, queryString:`api_key=${this.apiKey.value}`});
};

/**
 * Gets the number of victims for the nation based on the offense and variable
 * @param {OffenseVictim} offense the type of breach of a law or rule
 * @param {String} regionName location of the region the crime occurred
 * @param {Enum<age,count,ethnicity,race,sex,relationship>} category variable affecting crimes including examples: count, weapons, etc.
 * @returns {Object} structured data representing the location of the address
 */
Crime.regionalVictimCount = async function (offense, regionName, category) {
    return await this._requestData({path:`api/nibrs/${offense}/victim/regions/${regionName}/${category}`, queryString:`api_key=${this.apiKey.value}`});
};

/**
 * Gets the number of victims for the nation based on the offense and variable
 * @param {OffenseVictim} offense the type of breach of a law or rule
 * @param {String} stateAbbr state the crime occurred
 * @param {Enum<age,count,ethnicity,race,sex,relationship>} category variable affecting crimes including examples: count, weapons, etc.
 * @returns {Object} structured data representing the location of the address
 */
 Crime.stateVictimCount = async function (offense, stateAbbr, category) {
    return await this._requestData({path:`api/nibrs/${offense}/victim/states/${stateAbbr}/${category}`, queryString:`api_key=${this.apiKey.value}`});
};

module.exports = Crime;
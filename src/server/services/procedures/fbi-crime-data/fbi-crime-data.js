/**
 * The FBICrimeData Service provides access to the FBI database,
 * containing catalogued information on crime statistics.
 *
 * For more information, check out https://crime-data-explorer.fr.cloud.gov/pages/docApi
 * 
 * @alpha
 * @service
 * @category Society
 */
'use strict';

const {registerTypes} = require('./types');
const ApiConsumer = require('../utils/api-consumer');
const {DataDotGovKey} = require('../utils/api-key');
const Crime = new ApiConsumer('FBICrimeData', 'https://api.usa.gov/crime/fbi/sapi/', {cache: {ttl: 24*60*60}});
const _ = require('lodash');
ApiConsumer.setRequiredApiKey(Crime, DataDotGovKey);
registerTypes();

// TODO: We are going to need to clean up the results...
function assertValidYearRange(startYear, endYear) {
    if (endYear < startYear) {
        throw Error('End year should not be less than start year.');
    }
}

const REQUIRED_SUPP_OFFENSE = {
    'MVT_RECOVERED': { req: 'motor-vehicle-theft', category: 'MVT Recovered', offense: 'motor vehicle theft' },
    'LARCENY_TYPE': { req: 'larceny', category: 'Larceny Type', offense: 'larceny' },
};
function assertSupplementalOffenseCat(offense, category) {
    const req = REQUIRED_SUPP_OFFENSE[category];
    if (req && offense !== req.req) {
        throw Error(`The "${req.category}" category can only be used with the "${req.offense}" offense option`);
    }
}

function createCategoryDict(data) {
    const byYear = (a, b) => a.data_year < b.data_year ? -1 : 1;
    const countsByCategory = _.groupBy(data, datum => datum.key);
    const aggregateCounts = _.mapValues(
        countsByCategory,
        data => data
            .sort(byYear)
            .reduce((yearCounts, datum) => {
                let yearCount = yearCounts[yearCounts.length - 1];
                if (!yearCount || datum.data_year !== yearCount[0]) {
                    yearCount = [datum.data_year, 0];
                    yearCounts.push(yearCount);
                }
                yearCount[1] += datum.value;
                return yearCounts;
            }, [])
    );
    return aggregateCounts;
}

/** 
 * Get the number of offenses for a specific instance
 * @category National
 * 
 * @param {OffenseData} offense the type of breach of a law or rule
 * @param {OffenseDataOpt} category variable affecting crimes including examples: count, weapons, etc. 
 * @returns {Object} data related to national offense count
 */
Crime.nationalOffenseCount = async function (offense, category) {
    const raw = await this._requestData({
        path: `api/data/nibrs/${offense}/offense/national/${category}`,
        queryString: `api_key=${this.apiKey.value}`,
    });
    // raw also has pagination info, but as near as i can tell their api doesn't actually use it
    // (even the "all offenses" option returns everything in one page)
    return raw.results;
};

/**
 * Get the number of offenses for a specific region
 * @category Regional
 * 
 * @param {USRegion} region indicates in which region the crime has occurred
 * @param {OffenseData} offense the type of breach of a law or rule
 * @param {OffenseDataOpt} category variable affecting crimes including examples: count, weapons, etc.
 * @returns {Object} data related to the regional offense count
 */
Crime.regionalOffenseCount = async function (region, offense, category) {
    const res = await this._requestData({
        path: `api/data/nibrs/${offense}/offense/regions/${region}/${category}`,
        queryString: `api_key=${this.apiKey.value}`,
    });
    // res has pagination etc. etc. see other comments
    return res.results;
};

/**
 * Get the number of offenses for a specific region
 * @category State
 * 
 * @param {USTerritory} state location of the crime (abbreviated US state)
 * @param {OffenseData} offense the type of offense committed
 * @param {OffenseDataOpt} category variable affecting crimes including examples: count, weapons, etc
 * @returns {Object} data related to the state offense count
 */
Crime.stateOffenseCount = async function (state, offense, category) {
    const res = await this._requestData({
        path: `api/data/nibrs/${offense}/offense/states/${state}/${category}`,
        queryString: `api_key=${this.apiKey.value}`,
    });
    // res has pagination etc. etc. see other comments
    return res.results;
};

/**
 * Get the number of supplemental offenses nationwise
 * @category National
 * 
 * @param {OffenseSupplemental} offense the type of breach of a law or rule
 * @param {SuppDataOpt} category variable affecting crimes including examples: count, weapons, etc.
 * @param {BoundedInteger<1985, 2019>} startYear beginning year
 * @param {BoundedInteger<1985, 2019>} endYear ending year
 * @returns {Object} data related to national supplemental count
 */
Crime.nationalSupplementalCount = async function (offense, category, startYear, endYear) {
    assertValidYearRange(startYear, endYear);
    assertSupplementalOffenseCat(offense, category);

    const res = await this._requestData({
        path: `api/data/supplemental/${offense}/national/${category}/${startYear}/${endYear}`,
        queryString: `api_key=${this.apiKey.value}`,
    });
    // res has pagination info, but as far as i can tell they don't (currently) actually paginate the data, so we can just return the results
    return res.results;
};

/**
 * Get the number of supplemental offenses for a state
 * @category State
 * 
 * @param {USTerritory} state location of the crime in a state
 * @param {OffenseSupplemental} offense the type of breach of a law or rule
 * @param {SuppDataOpt} category variable affecting crimes including examples: count, weapons, etc.
 * @param {BoundedInteger<1985, 2019>} startYear beginning year
 * @param {BoundedInteger<1985, 2019>} endYear ending year
 * @returns {Object} data related to state supplemental count
 */
Crime.stateSupplementalCount = async function (state, offense, category, startYear, endYear) {
    assertValidYearRange(startYear, endYear);
    assertSupplementalOffenseCat(offense, category);

    const res = await this._requestData({
        path: `api/data/supplemental/${offense}/states/${state}/${category}/${startYear}/${endYear}`,
        queryString: `api_key=${this.apiKey.value}`,
    });
    // res has pagination etc. etc. see other comments
    return res.results;
};

/**
 * Get the number of arrests for the nation in a certain time period
 * @category National
 * 
 * @param {OffenseArrest} offense the type of breach of a law or rule
 * @param {Enum<male,female,race>} category variable that describes the individual or crime committed
 * @param {BoundedInteger<1985, 2019>} startYear beginning year
 * @param {BoundedInteger<1985, 2019>} endYear ending year
 * @param {ArrestAgeCategory=} ageCategory the category of age statistics to retrieve - defaults to returning a table of all available age ranges
 * @returns {Object} data related to national arrest count
 */
Crime.nationalArrestCount = async function (offense, category, startYear, endYear, ageCategory='All') {
    assertValidYearRange(startYear, endYear);

    // TODO: why is male/female by age??
    if (ageCategory !== 'All' && category !== 'male' && category !== 'female') {
        throw Error('ageCategory is only allowed for male and female breakdowns');
    }

    const results = await this._requestData({
        path: `api/arrest/national/${offense}/${category}/${startYear}/${endYear}`,
        queryString: `api_key=${this.apiKey.value}`,
    });
    const aggregateCounts = createCategoryDict(results.data);
    return ageCategory === 'All' ? aggregateCounts : aggregateCounts[ageCategory];
};

/**
 * Get the number of arrests for the nation in a certain time period
 * @category Regional
 * 
 * @param {USRegion} region location of the region the crime occurred
 * @param {OffenseArrest} offense the type of breach of a law or rule
 * @param {Enum<male,female,offense,race,monthly>} category variable that describes the individual who committed the crime
 * @param {BoundedInteger<1985, 2019>} startYear beginning year
 * @param {BoundedInteger<1985, 2019>} endYear ending year
 * @returns {Object} data related to region arrest count
 */
Crime.regionalArrestCount = async function (region, offense, category, startYear, endYear) {
    assertValidYearRange(startYear, endYear);
    const res = await this._requestData({
        path: `api/arrest/regions/${region}/${offense}/${category}/${startYear}/${endYear}`,
        queryString: `api_key=${this.apiKey.value}`,
    });
    return res.data; // data is the only interesting field
};

/**
 * Get the number of arrests(for a particular offense) for the state in a certain time period
 * @category State
 * 
 * @param {USTerritory} state location of the state the crime occurred
 * @param {ArrestCategory} category a general value describing the type of crime or perpetrator
 * @param {BoundedInteger<1985, 2019>} startYear beginning year
 * @param {BoundedInteger<1985, 2019>} endYear ending year
 * @returns {Object} data related to state arrest count
 */
Crime.stateArrestCount = async function (state, category, startYear, endYear) {
    assertValidYearRange(startYear, endYear);
    const res = await this._requestData({
        path: `api/arrest/states/offense/${state}/${category}/${startYear}/${endYear}`,
        queryString: `api_key=${this.apiKey.value}`,
    });
    return res.data; // data is the only interesting part - keys are included in the data
};

/**
 * Get the number of victims for the nation based on the offense and variable
 * @category National
 * 
 * @param {OffenseVictim} offense the type of breach of a law or rule
 * @param {Enum<age,count,ethnicity,race,sex,relationship>} category variable that describes the individual who committed the crime
 * @returns {Object} data related to national victim count
 */
Crime.nationalVictimCount = async function (offense, category) {
    const res = await this._requestData({
        path: `api/nibrs/${offense}/victim/national/${category}`,
        queryString: `api_key=${this.apiKey.value}`,
    });
    return res.data; // data is the only interestng field
};

/**
 * Get the number of victims for the nation based on the offense and variable
 * @category Regional
 * 
 * @param {USRegion} region location of the region the crime occurred
 * @param {OffenseVictim} offense the type of breach of a law or rule
 * @param {Enum<age,count,ethnicity,race,sex,relationship>} category variable that describes the individual who committed the crime
 * @returns {Object} data related to regional victim count
 */
Crime.regionalVictimCount = async function (region, offense, category) {
    const res = await this._requestData({
        path: `api/nibrs/${offense}/victim/regions/${region}/${category}`,
        queryString: `api_key=${this.apiKey.value}`,
    });
    return res.data; // data is the only interesting field - keys are included in data
};

/**
 * Get the number of victims for the nation based on the offense and variable
 * @category State
 * 
 * @param {USTerritory} state state the crime occurred
 * @param {OffenseVictim} offense the type of breach of a law or rule
 * @param {Enum<age,count,ethnicity,race,sex,relationship>} category variable that describes the individual who committed the crime
 * @returns {Object} data related to state victim count
 */
Crime.stateVictimCount = async function (state, offense, category) {
    const results = await this._requestData({
        path: `api/nibrs/${offense}/victim/states/${state}/${category}`,
        queryString: `api_key=${this.apiKey.value}`,
    });
    const aggregateCounts = createCategoryDict(results.data);

    if (category == 'count') {
        return Object.values(aggregateCounts).pop();
    }

    return aggregateCounts;
};

module.exports = Crime;

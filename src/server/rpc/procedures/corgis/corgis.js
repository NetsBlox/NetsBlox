const ApiConsumer = require('../utils/api-consumer'),
    jsonQuery = require('json-query'),
    corgiDatasets = require('./datasets.js'),
    fse = require('fse');

let corgis = new ApiConsumer('Corgis','');

const STORAGE_DIR = process.env.CORGIS_DIR || 'datasets/';

let loadDataset = dsName => {
    let absolutePath = STORAGE_DIR + dsName + '.json';
    return new Promise((resolve, reject) => {
        fse.readFile(absolutePath, 'utf8', function (err,data) {
            if (err) {
                reject(err);
            }
            if (data) {
                try {
                    data = JSON.parse(data);
                    resolve(data);
                } catch (e) {
                    reject(e);
                }
            }
        }); // end of fse.readFile
    });
};

const datasetsMetadata = corgiDatasets.parseDatasetsInfo();


/**
 * Search CORGIS' datasets as provided by https://think.cs.vt.edu/corgis/
 * Example queries:
 * cancer dataset: [*Year<2000 && Area=Arizona]
 * @param {String} name dataset name
 * @param {String=} query search query. (read more: "npm json-query")
 * @param {Number=} limit limit the number of requested results. max 100.
 * @returns {Object} search results
 */
corgis.searchDataset = async function(name, query, limit){
    // TODO pagination option
    const LIST_SIZE_LIMIT = 100;
    if (!query.startsWith('records')) query = 'records' + query;

    limit = Math.min(LIST_SIZE_LIMIT, limit);
    let records = await loadDataset(name);
    this._logger.trace(records.length, 'results loaded');
    if (!query) {
        let randRecordIdx = parseInt(Math.random()*records.length);
        let sample = records[randRecordIdx];
        return this._createSnapStructure(sample);
    }
    let queryRes = jsonQuery(query, {data: {records}});
    let matchinRecords = queryRes.value;
    if (!matchinRecords) throw new Error('no matching results');
    let matchCount = Array.isArray(matchinRecords) ? matchinRecords.length : 1;
    this._logger.trace('matching results:', matchCount);
    if (matchCount > LIST_SIZE_LIMIT) matchinRecords = matchinRecords.slice(0, limit);
    return this._createSnapStructure(matchinRecords);
};

/**
 * Shows a list of corgis datasets with description, tags and links
 * @returns {Object} list of corgis datasets
 */
corgis.allDatasets = function() {
    return datasetsMetadata;
};

/**
 * Shows a list available of corgis datasets with description, tags and links
 * @returns {Object} list of corgis datasets
 */
corgis.availableDatasets = function() {
    return datasetsMetadata.filter(it => it.isAvailable);
};


datasetsMetadata.forEach(ds => {
    corgis[ds.id] = function(query, limit) {
        return corgis.searchDataset(ds.id, query, limit);
    };
});


corgis.isSupported = function() {
    const isNotProduction = (process.env.ENV !== 'production'); // unreleased service
    const dataExists = corgis.availableDatasets().length > 0;
    return (isNotProduction && dataExists);
};

module.exports = corgis;

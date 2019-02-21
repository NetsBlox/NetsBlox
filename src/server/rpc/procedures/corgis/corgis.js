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
 * @param {String} name dataset name
 * @param {String=} query search query in JSON
 * @returns {Object} search results
 */

corgis.searchDataset = async function(name, query){
    let records = await loadDataset(name);
    this._logger.trace(records.length, 'results loaded');
    if (!query) {
        let randRecordIdx = parseInt(Math.random()*records.length);
        let sample = records[randRecordIdx];
        return this._createSnapStructure(sample);
    }
    let queryRes = jsonQuery(query, {data: {records}});
    let matchinRecords = queryRes.value;
    let matchCount = Array.isArray(matchinRecords) ? matchinRecords.length : 1;
    console.log(queryRes);
    this._logger.trace('matching results:', matchCount);
    return this._createSnapStructure(matchinRecords);
};

corgis.allDatasets = function() {
    return datasetsMetadata;
};

corgis.availableDatasets = function() {
    return datasetsMetadata.filter(it => it.isAvailable);
};


datasetsMetadata.forEach(ds => {
    corgis[ds.id] = function(query) {
        return corgis.searchDataset(ds.id, query);
    };
});


corgis.isSupported = function() {
    const isNotProduction = (process.env.ENV !== 'production'); // unreleased service
    const dataExists = corgis.availableDatasets().length > 0;
    return (isNotProduction && dataExists);
};

module.exports = corgis;

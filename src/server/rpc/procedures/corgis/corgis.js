const ApiConsumer = require('../utils/api-consumer'),
    jsonQuery = require('json-query'),
    fs = require('fs');

let corgis = new ApiConsumer('corgis','');

const STORAGE_DIR = process.env.CORGIS_DIR || 'datasets/';

let loadDataset = dsName => {
    let absolutePath = STORAGE_DIR + dsName + '.json';
    return new Promise((resolve, reject) => {
        fs.readFile(absolutePath, 'utf8', function (err,data) {
            if (err) {
                reject(err);
            }
            if (data) {
                data = JSON.parse(data);
                resolve(data);
            }
        }); // end of fs.readFile
    });
};

/**
 * Search CORGIS' datasets as provided by https://think.cs.vt.edu/corgis/
 * @param {String} name dataset name
 * @param {String=} query json search query
 * @returns {Object} search results
 */

corgis.searchDataset = function(name,query){
    return loadDataset(name)
        .then( data => {
            this._logger.trace(data.length, 'results loaded');
            if (!query) {
                let sample = data[0];
                return this._createSnapStructure(sample);
            }
            let queryRes = jsonQuery(query,{data}).value;
            this._logger.trace(queryRes);
            this.response.send(this._createSnapStructure(queryRes));
        })
        .catch(this._logger.error);
};



corgis.isSupported = function() {
    const isNotProduction = (process.env.ENV !== 'production'); // unreleased service
    const dataExists = fse.existsSync(STORAGE_DIR);
    return (isNotProduction && dataExists);
};

module.exports = corgis;

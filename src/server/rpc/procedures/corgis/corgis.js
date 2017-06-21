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

corgis.searchDataset = function(name,query){
    return loadDataset(name)
        .then( data => {
            this._logger.trace(data.length, 'rows loaded');
            let queryRes = jsonQuery(query,{data}).value;
            this._logger.trace(queryRes);
            this.response.send(this._createSnapStructure(queryRes));
        })
        .catch(err => this._logger.error);
};



module.exports = corgis;

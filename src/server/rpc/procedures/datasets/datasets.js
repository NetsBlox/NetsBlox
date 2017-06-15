const ApiConsumer = require('../utils/api-consumer'),
    jsonQuery = require('json-query'),
    exec = require('child_process').exec,
    fs = require('fs'),
    osmosis = require('osmosis');

let datasets = new ApiConsumer('datasets','');

const STORAGE_DIR = process.env.DATASETS_DIR || 'datasets/';

datasets._datasetNames = [];
datasets._datasetDescription = [];
// probably a shell script would be better
let updateDatasets = () => {
    if (!fs.existsSync(STORAGE_DIR)){
        fs.mkdirSync(STORAGE_DIR);
    }
    return new Promise((resolve, reject) => {
        osmosis
        .get('https://think.cs.vt.edu/corgis/json/index.html')
        .find('.media')
        .set({
            name: '.media-body a @href',
            description: '.media-body'
        })
        .data(dataset => {
            datasets._datasetNames.push(dataset.name.match(/(.*)\//)[1]);
            datasets._datasetDescription.push(dataset.description.match(/\s{2,}(.+)\s+/)[1]);
        })
        .done(()=>{
            datasets._datasetNames.forEach(dsName => {
                let directUrl = `https://think.cs.vt.edu/corgis/json/${dsName}/${dsName}.json?forcedownload=1`;
                let absolutePath = STORAGE_DIR + dsName + '.json';
                datasets._logger.trace('updating dataset', dsName, directUrl);
                exec(`curl ${directUrl} -o ${absolutePath}`, (error, stdout, stderr)=>{
                });
            });
        })
        .log(datasets._logger.trace)
        // .debug(corgis._logger.trace)
        .error(reject);
    });
};


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

updateDatasets();
datasets.searchDataset = function(name,query){
    return loadDataset(name)
        .then( data => {
            this._logger.trace(data.length, 'rows loaded');
            let queryRes = jsonQuery(query,{data}).value;
            this._logger.trace(queryRes);
            this.response.send(this._createSnapStructure(queryRes));
        })
        .catch(err => this._logger.error);
};

datasets.datasetsNames = function() {
    let result = this._datasetNames.map(function(name, index) {
        return {
            name: name,
            description: this._datasetDescription[index]
        };
    }, this);
    return this._createSnapStructure(result);
};

module.exports = datasets;
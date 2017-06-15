const ApiConsumer = require('../utils/api-consumer'),
    jsonQuery = require('json-query'),
    exec = require('child_process').exec,
    fs = require('fs'),
    osmosis = require('osmosis');

let corgis = new ApiConsumer('corgis','');

const STORAGE_DIR = process.env.CORGIS_DIR || 'datasets/';

// probably a shell script would be better
let updateDatasets = (names) => {
    if (!fs.existsSync(STORAGE_DIR)){
        fs.mkdirSync(STORAGE_DIR);
    }
    return new Promise((resolve, reject) => {
        if (names === undefined) names = [];
        osmosis
        .get('https://think.cs.vt.edu/corgis/json/index.html')
        .find('.media-body a')
        .set({name: '@href'})
        .data(dataset => {
            names.push(dataset.name.match(/(.*)\//)[1]);
        })
        .done(()=>{
            names.forEach(dsName => {
                let directUrl = `https://think.cs.vt.edu/corgis/json/${dsName}/${dsName}.json?forcedownload=1`;
                let absolutePath = STORAGE_DIR + dsName + '.json';
                corgis._logger.trace('updating dataset', dsName, directUrl);
                exec(`curl ${directUrl} -o ${absolutePath}`, (error, stdout, stderr)=>{
                });
            });
        })
        .log(corgis._logger.trace)
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
corgis.searchDataset = function(name,query){
    return loadDataset(name)
        .then( data => {
            this._logger.trace(data.length, 'rows loaded');
            let queryRes = jsonQuery(query,{data}).value;
            this._logger.trace(queryRes);
            this.response.json(queryRes);
        })
        .catch(err => this._logger.error);
};



module.exports = corgis;

const fs = require('fs'),
    osmosis = require('osmosis'),
    exec = require('child_process').exec,
    Q = require('q');

const STORAGE_DIR = process.env.CORGIS_DIR || 'datasets/';


// in: array of dataset names
// out: downloads all the datasets to the predefined location
let updateDatasets = (names) => {
    if (!fs.existsSync(STORAGE_DIR)){
        fs.mkdirSync(STORAGE_DIR);
    }
    console.log(names);
    names.forEach(dsName => {
        console.log('downloading for', dsName);
        let directUrl = `https://think.cs.vt.edu/corgis/json/${dsName}/${dsName}.json?forcedownload=1`;
        let absolutePath = STORAGE_DIR + dsName + '.json';
        console.log('updating dataset', dsName, directUrl);
        exec(`curl ${directUrl} -o ${absolutePath}`, ()=>{});
    });
};


// finds out what datasets are available
let discoverDatasets = () => {
    let deferred = Q.defer();
    let names = [];
    osmosis
        .get('https://think.cs.vt.edu/corgis/json/index.html')
        .find('.media-body a')
        .set({name: '@href'})
        .data(dataset => {
            names.push(dataset.name.match(/(.*)\//)[1]);
        })
        .done(()=>{
            deferred.resolve(names);
        })
    // .log(console.log)
    // .debug(console.log)
        .error(deferred.reject);
    return deferred.promise;
};

discoverDatasets().then(names => {
    // console.log(names);
    updateDatasets(names);
});

module.exports = {
    discoverDatasets,
    updateDatasets,
};

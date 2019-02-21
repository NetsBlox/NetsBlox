const fs = require('fs'),
    osmosis = require('osmosis'),
    Q = require('q');
const https = require('https');

const STORAGE_DIR = process.env.CORGIS_DIR || 'datasets/';






const downloadFile = function(url, dest, cb) {
    const file = fs.createWriteStream(dest);
    https.get(url, function(response) {
        response.pipe(file);
        file.on('finish', function() {
            file.close(cb);  // close() is async, call cb after close completes.
        });
    }).on('error', function(err) { // Handle errors
        fs.unlink(dest); // Delete the file async. (But we don't check the result)
        if (cb) cb(err.message);
    });
};




// in: array of dataset names
// out: downloads all the datasets to the predefined location
/* eslint-disable no-console */
let updateDatasets = (names) => {
    if (!fs.existsSync(STORAGE_DIR)){
        fs.mkdirSync(STORAGE_DIR);
    }
    names.forEach(dsName => {
        console.log('downloading for', dsName);
        let directUrl = `https://think.cs.vt.edu/corgis/json/${dsName}/${dsName}.json?forcedownload=1`;
        let absolutePath = STORAGE_DIR + dsName + '.json';
        console.log('updating dataset', dsName, directUrl);
        downloadFile(directUrl, absolutePath, console.log);
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
}).catch(e => console.error(e));
/* eslint-enable no-console */

module.exports = {
    discoverDatasets,
    updateDatasets,
};

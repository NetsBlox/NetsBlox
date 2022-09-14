const fs = require('fs');
const path = require('path');

// reads from a text file containing dataset descriptions in the following format

/*
url
title
desc
tags

url
title
desc
tags
*/

const STORAGE_DIR = process.env.CORGIS_DIR || 'datasets/';

const readAvailableDatasetNames = () => {
    if (!fs.existsSync(STORAGE_DIR)) return [];
    let files = fs.readdirSync(STORAGE_DIR);
    files = files.map(fName => fName.replace('.json', ''));
    return files;
};

const downloadedSets = readAvailableDatasetNames();

function parseDatasetsInfo() {
    let file = fs.readFileSync(path.join(__dirname, 'datasets.list'), 'utf8');

    let datasetsMetadata = file
        .split('\n\n')
        .map(group => {
            group = group
                .split('\n');
            let [url, title, description, tags] = group;

            //get the id
            let urlPieces = url.split('/');
            let id = urlPieces[urlPieces.length - 1].replace('.html', '');

            return {
                id,
                url,
                title,
                description,
                tags: tags.split(', '),
                isAvailable: downloadedSets.includes(id),
            };
        });
    return datasetsMetadata;
}

// console.log(parseDatasetsInfo().filter(it => it.isAvailable).map(it => it.title).length);

module.exports = {
    parseDatasetsInfo,
    downloadedSets,
};

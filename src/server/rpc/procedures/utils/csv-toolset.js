/*
 This module provides helpers to achieve the following
 - download a csv file
    - or load from disk
    - readstream
 - create a read stream from a csv file
 - validate a csv file?
 - load and parse the csv contents
 - save records to the database
 - provide seeding helpers
 */

const fs = require('fs');
const parse = require('csv-parse');
const mongoose = require('mongoose');
const request = require('request');

let model;

const modelFields = function(aModel) {
    let fields = Object.keys(aModel.schema.paths);
    return fields.slice(0,fields.length-2); // exclude id and v
};

// parserFn: called on each individual record object to transform if necessary
const createCSVParser = function(parserFn) {
    let recCounter = 0; // FIXME might need to attach to the parser obj
    const BATCH_SIZE = 1e+4;
    const headers = modelFields(model);


    /* eslint-disable no-console*/
    async function batchProcess(records) {
        console.log(`saving ${records.length} records to the database..`);
        await model.insertMany(records);
        recordsBatch = [];
    }


    let recordsBatch = [];

    const parser = parse({
        delimiter: ','
    });

    parser.on('readable', async function(){
        let record = this.read();
        while (record) {
            let obj = {};
            record.forEach((value, index) => {
                if (value !== '') {
                    value = value.trim();
                    obj[headers[index]] = value;
                }
            });

            if (typeof parserFn === 'function') obj = parserFn(obj);
            if (obj) recordsBatch.push(obj); // the parser might filter out records it doesn't want

            if (recordsBatch.length === BATCH_SIZE) {
                await batchProcess(recordsBatch);
            }
            record = this.read();
            recCounter++;
        }
    });

    parser.on('error', function(err){
        console.error(err.message);
    });

    parser.on('end', async function(){
        await batchProcess(recordsBatch);
        console.log(`finished processing ${recCounter} records`);
        mongoose.disconnect();
    });
    /* eslint-enable no-console*/

    return parser;
};

const streamFromUrl = function(url) {
    const readStream = request(url);
    return readStream;
};

const streamFromDisk = function(path, startLine=0) {
    return fs.createReadStream(path, {start: startLine});
};

async function start(aDbModel, opts) {
    opts = {
        recParser: undefined,
        filePath: undefined,
        url: undefined,
        ...opts
    };

    if (!opts.filePath && !opts.url) {
        // eslint-disable-next-line no-console
        console.error('missing required source file');
        mongoose.disconnect();
        process.exit(1);
    }

    model = aDbModel;

    // drop/clearout the collection
    await model.deleteMany({}); // a better strategy?

    const parser = createCSVParser(opts.recParser);
    const readStream = opts.filePath ?
        streamFromDisk(opts.filePath):
        streamFromUrl(opts.url);
    readStream
        .pipe(parser);
}

module.exports = start;

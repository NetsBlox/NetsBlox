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
     - cli args: commander?
     */

const fs = require('fs');
const parse = require('csv-parse');
const mongoose = require('mongoose');
const request = require('request');
const Command = require('commander').Command;
const program = new Command();
let model; // TODO


program
    .option('--url <url>', 'direct url to a verified and expected csv file')
    .option('--file <file>', 'path to a csv file');

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

async function start(aModel, aParserFn) {
    program.parse(process.argv);
    if (!program.url && !program.file) {
    /* eslint-disable no-console*/
        console.error('Missing required options. Get help with --help');
        /* eslint-enable no-console*/
        mongoose.disconnect();
        process.exit(1);
    }

    model = aModel;

    // drop/clearout the collection
    await model.deleteMany({}); // a better strategy?
    const parser = createCSVParser(aParserFn);

    const readStream = program.file ?
        streamFromDisk(program.file):
        streamFromUrl(program.url);

    readStream
        .pipe(parser);
}

module.exports = {start, program};

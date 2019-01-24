#!/bin/env node
// prepares and loads csv into the database
// if other services need the same functionality this should be refactored to allow reuse.

const parse = require('csv-parse');
const fs = require('fs');
const mongoose = require('mongoose');
const MetObjectCol = require('./database');
const request = require('request');

const headers = fs.readFileSync(__dirname + '/metobjects.headers', {encoding: 'utf8'})
    .trim()
    .split(',');

let recCounter = 0;

/* eslint-disable no-console*/
async function batchProcess(records) {
    console.log(`saving ${records.length} records to the database..`);
    await MetObjectCol.insertMany(records);
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
        recordsBatch.push(obj);
        if (recordsBatch.length === 1e+4) {
            await batchProcess(recordsBatch);
            recordsBatch = [];
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


async function start() {
    await MetObjectCol.deleteMany({}); // drop/clearout the collection
    const inputFile = process.argv[2];

    const readStream = inputFile ?
        fs.createReadStream(inputFile, {start: 1}):
        request('https://media.githubusercontent.com/media/metmuseum/openaccess/master/MetObjects.csv');

    readStream
        .pipe(parser);
}

start();

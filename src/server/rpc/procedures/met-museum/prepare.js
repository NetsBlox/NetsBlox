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


// counts and sorts the most common attributes in the dataset
function calcStats(records) {
    let availability = headers.map(attr => {
        let count = records.filter(rec => rec[attr] && rec[attr] !== '').length;
        return [attr, count];
    });
    availability.sort((a, b) => a[1] < b[1] ? -1 : 1);
    console.log(availability);
    return availability;
}

async function batchProcess(records) {
    console.log(`saving ${records.length} records to the database..`);
    await MetObjectCol.insertMany(records);
}


let recordsBatch = [];

const parser = parse({
    delimiter: ','
});

parser.on('readable', async function(){
    let record;
    while (record = this.read()) {
        let obj = {};
        record.forEach((value, index) => {
            if (value !== '') {
                value = value.trim();
                // TODO parse to appropriate datatype
                obj[headers[index]] = value;
            }
        });
        recordsBatch.push(obj);
        if (recordsBatch.length === 1e+4) {
            await batchProcess(recordsBatch);
            recordsBatch = [];
        }
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

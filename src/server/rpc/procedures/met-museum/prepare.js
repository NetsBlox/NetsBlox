// prepares and loads csv into the database
// if other services need the same functionality this should be refactored to allow reuse.

const parse = require('csv-parse');
const fs = require('fs');
const mongoose = require('mongoose');
const MetObjectCol = require('./database');

const inputFile = process.argv[2];
const headers = fs.readFileSync('./metobjects.headers', {encoding: 'utf8'})
    .trim()
    .split(',');

const records = [];

const parser = parse({
    delimiter: ','
});

parser.on('readable', function(){
    let record = this.read(); // skip the header row
    while (record = this.read()) {
        let obj = {};
        record.forEach((value, index) => {
            if (value !== '') {
                value = value.trim();
                // TODO parse to appropriate datatype
                obj[headers[index]] = value;
            }
        });
        // could be optimized to not accumulate the records in memory and make pushes to database in batches
        records.push(obj);
    }
});

parser.on('error', function(err){
    console.error(err.message);
});

parser.on('end', async function(){
    console.log(`finished parsing ${records.length} records`);
    // console.log(records.slice(0,3));
    // await MetObjectCol.insertMany(records);
    mongoose.disconnect();
});

fs.createReadStream(inputFile)
    .pipe(parser);


// counts and sorts the most common attributes in the dataset
function calcStats() {
    let availability = headers.map(attr => {
        let count = records.filter(rec => rec[attr] && rec[attr] !== '').length;
        return [attr, count];
    });
    availability.sort((a, b) => a[1] < b[1] ? -1 : 1);
    console.log(availability);
    return availability;
}

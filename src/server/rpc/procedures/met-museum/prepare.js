
// load csv into the database

const parse = require('csv-parse');
const fs = require('fs');

const inputFile = process.argv[2];
const output = [];

const parser = parse({
    delimiter: ','
});

parser.on('readable', function(){
    let record;
    while (record = this.read()) {
        output.push(record);
    }
});

parser.on('error', function(err){
    console.error(err.message);
});

parser.on('end', function(){
    console.log('done');
    // TODO load into database
});

console.log('piping', inputFile);
fs.createReadStream(inputFile)
    .pipe(parser);

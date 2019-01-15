
// load csv into the database

const parse = require('csv-parse');
const fs = require('fs');

const inputFile = process.argv[2];
const headers = fs.readFileSync('./metobjects.headers', {encoding: 'utf8'})
    .trim()
    .split(',');

const output = [];

const parser = parse({
    delimiter: ','
});

parser.on('readable', function(){
    let record;
    while (record = this.read()) {
        let obj = {};
        headers.forEach((attr, index) => {
            obj[attr] = record[index];
        });
        output.push(obj);
    }
});

parser.on('error', function(err){
    console.error(err.message);
});

parser.on('end', function(){
    console.log('done');
    console.log(output.slice(0,3));
});

console.log('piping', inputFile);
fs.createReadStream(inputFile)
    .pipe(parser);

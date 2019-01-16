const mongoose = require('mongoose');
const fs = require('fs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost/nb-services';

mongoose.connect(MONGO_URI, { useNewUrlParser: true });


const schemaDef = {};
const headers = fs.readFileSync('./metobjects.headers', {encoding: 'utf8'})
    .trim()
    .split(',');
headers.forEach(attr => {
  schemaDef[attr] = String;
})

const schema = new mongoose.Schema(schemaDef);

const MetObject = mongoose.model('met-objects', schema);

module.exports = MetObject;

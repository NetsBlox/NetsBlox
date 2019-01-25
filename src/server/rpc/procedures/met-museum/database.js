const mongoose = require('mongoose');
const fs = require('fs');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost/netsblox';

mongoose.connect(MONGO_URI, { useNewUrlParser: true });


const schemaDef = {};
const headers = fs.readFileSync(__dirname + '/metobjects.headers', {encoding: 'utf8'})
    .trim()
    .split(',');
headers.forEach(attr => {
    schemaDef[attr] = String;
});

const schema = new mongoose.Schema(schemaDef);

const MetObject = mongoose.model('netsblox:service:metmuseum', schema);

module.exports = MetObject;

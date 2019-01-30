const mongoose = require('mongoose');
const { isValidServiceName } = require('./procedures/utils');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost/netsblox';
mongoose.connect(MONGO_URI, { useNewUrlParser: true });

// this could probably have a better name
// creates a mongoose model for a service
function serviceStorage(serviceName, schemaDef) {
    const schema = new mongoose.Schema(schemaDef);
    if (!isValidServiceName(serviceName)) throw new Error('invalid service name');
    const model = mongoose.model(`netsblox:services:${serviceName}`, schema);
    return model;
}

module.exports = serviceStorage;

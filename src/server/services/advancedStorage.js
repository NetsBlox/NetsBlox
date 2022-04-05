const mongoose = require('mongoose');
const Logger = require('./logger');
const logger = new Logger('netsblox:storage:services');
const { isValidServiceName } = require('./procedures/utils');
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/admin'; // probably should mention netsblox instead of admin
mongoose.connect(MONGO_URI, { useNewUrlParser: true });

// this could probably have a better name
// creates a mongoose model for a service
function getServiceStorage(collectionName, schemaDef) {
    logger.trace(`setting up storage for "${collectionName}"`);
    const schema = new mongoose.Schema(schemaDef);
    if (!isValidServiceName(collectionName)) throw new Error('invalid service name');
    const model = mongoose.model(`netsblox:services:${collectionName}`, schema);
    return model;
}

module.exports = getServiceStorage;

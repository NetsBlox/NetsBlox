// Detect and load the correct backend (default is 'fs')

const BLOB_BACKEND = process.env.BLOB_BACKEND || 'fs';
const Logger = require('../../logger');
const logger = new Logger('netsblox:blob');

const BlobStorage = require('./blob');

module.exports = new BlobStorage(logger, BLOB_BACKEND);

// Detect and load the correct backend
//   Default: fs
// TODO


// Public API:
//   - store(data): Promise<id>
//   - get(hash): Promise<data>

const hash = require('../../../common/sha512').hex_sha512;
const Q = require('q');
const BLOB_BACKEND = process.env.BLOB_BACKEND || 'fs';
const Logger = require('../../logger');
const logger = new Logger('netsblox:blob');

// Backends
const S3Backend = require('./s3');
const FSBackend = require('./fs');

class BlobStorage {

    constructor() {
        if (BLOB_BACKEND === 's3') {
            this.backend = new S3Backend(logger);
        } else {
            this.backend = new FSBackend(logger);
        }
    }

    get(id) {
        logger.trace(`Retrieving ${id}`);
        return this.backend.get(id);
    }

    store(data) {
        const id = hash(data);
        logger.trace(`Storing data for ${id}`);
        return Q(this.backend.store(id, data))
            .then(() => id);
    }

    // List all ids (for migrations)
    list() {
        return this.backend.list();
    }
}

module.exports = new BlobStorage();

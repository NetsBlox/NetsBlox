// Note: This file should only be required by 'index.js' (from the same dir).
// This will ensure that there is only a single connection and blob backend used.
//
// The only exception (and reason for not defining this class in index.js) is for
// utility scripts such as blob migrations.

// Public API:
//   - store(data): Promise<id>
//   - get(hash): Promise<data>

const hash = require('../../../common/sha512').hex_sha512;
const Q = require('q');

// Backends
const S3Backend = require('./s3');
const FSBackend = require('./fs');

class BlobStorage {

    constructor(logger, backendType) {
        this.logger = logger;
        if (backendType === 's3') {
            this.backend = new S3Backend(logger);
        } else {
            backendType = 'fs';
            this.backend = new FSBackend(logger);
        }
        this.backendType = backendType;
    }

    get(id) {
        this.logger.trace(`Retrieving ${id}`);
        return this.backend.get(id);
    }

    store(data) {
        const id = hash(data);
        this.logger.trace(`Storing data for ${id}`);
        return Q(this.backend.store(id, data))
            .then(() => id);
    }

    // List all ids (for migrations)
    list() {
        return this.backend.list();
    }
}

module.exports = BlobStorage;

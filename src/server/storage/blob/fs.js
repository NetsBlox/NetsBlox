// blob storage used for the raw project storage and media storage
// Set the location using NETSBLOX_BLOB_DIR (default is /<netsblox-root>/blob-storage)

// Functionality:
//  - CRD (create/store, get, remove/delete)
//    - they should all be "promisified"
//  - create should return id (hash - probably sha256)

const path = require('path');
const fse = require('fs-extra');
const fs = require('fs');
const Q = require('q');
const exists = require('exists-file');
const BASE_DIR = process.env.NETSBLOX_BLOB_DIR ||
        path.join(__dirname, '..', '..', '..', 'blob-storage');

class FSBackend {

    constructor(_logger) {
        this.logger = _logger.fork('fs');
        // create the given directory, if needed
        this.logger.info(`blob directory is ${BASE_DIR}`);
        this.configure(BASE_DIR);
    }

    _verifyExists() {
        if (!exists.sync(this.baseDir)) {
            this.logger.info(`created blob directory at ${this.baseDir}`);
            fse.ensureDirSync(this.baseDir);
        }
    }

    configure(dir) {
        this.baseDir = dir;
    }

    getDirectoryAndFile(hash) {
        if (!hash || !hash.substring) {
            throw Error(`Invalid hash "${hash}"`);
        }

        const dirname = path.join(this.baseDir, hash.substring(0, 2));
        const filename = path.join(dirname, hash.substring(2));

        return [dirname, filename];
    }

    dataExists(id) {
        let [, filename] = this.getDirectoryAndFile(id);
        return exists.sync(filename);
    }

    store(id, data) {
        const [dirname, filename] = this.getDirectoryAndFile(id);

        this.logger.info(`storing data in the blob: ${id}`);

        // store the data and return the hash
        this._verifyExists();
        return Q.nfcall(fse.ensureDir, dirname)
            .then(() => {
                if (!exists.sync(filename)) {
                    return Q.nfcall(fs.writeFile, filename, data);
                } else {
                    this.logger.trace(`data already stored. skipping write ${id}`);
                    return Q();
                }
            })
            .then(() => id)
            .fail(err => {
                this.logger.error(`Could not write to ${filename}: ${err}`);
                throw err;
            });
    }

    get(id) {
        var filename = this.getDirectoryAndFile(id)[1];

        // get the data from the given hash
        return Q.nfcall(fs.readFile, filename, 'utf8')
            .fail(err => {
                this.logger.error(`Could not read from ${filename}: ${err}`);
                throw err;
            });
    }

    list() {
        return fse.readdir(this.baseDir)
            .then(prefixes => {
                this.logger.log(`found ${prefixes} prefixes`);
                const promises = prefixes.map(name => {
                    const absdir = path.join(this.baseDir, name);
                    return fse.readdir(absdir)
                        .then(postfixes => postfixes.map(end => name + end));
                });

                return Q.all(promises)
                    .then(lists => lists.reduce((l1, l2) => l1.concat(l2), []));
            });
    }
}

module.exports = FSBackend;

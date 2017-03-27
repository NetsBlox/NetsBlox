// blob storage used for the raw project storage and media storage
// Set the location using NETSBLOX_BLOB_DIR (default is /<netsblox-root>/blob-storage)

// Functionality:
//  - CRD (create/store, get, remove/delete)
//    - they should all be "promisified"
//  - create should return id (hash - probably sha256)

const Logger = require('../logger'),
    logger = new Logger('netsblox:blob-storage'),
    hash = require('../../common/sha512').hex_sha512,
    path = require('path'),
    fse = require('fs-extra'),
    fs = require('fs'),
    Q = require('q'),
    exists = require('exists-file'),
    BASE_DIR = process.env.NETSBLOX_BLOB_DIR ||
        path.join(__dirname, '..', '..', '..', 'blob-storage');

var BlobStorage = function() {
    // create the given directory, if needed
    logger.info(`blob directory is ${BASE_DIR}`);
    this.configure(BASE_DIR);
};

BlobStorage.prototype._verifyExists = function() {
    if (!exists.sync(this.baseDir)) {
        logger.info(`created blob directory at ${this.baseDir}`);
        fse.ensureDirSync(this.baseDir);
    }
};

BlobStorage.prototype.configure = function(dir) {
    this.baseDir = dir;
};

BlobStorage.prototype.store = function(data) {
    var id = hash(data),
        dirname = path.join(this.baseDir, id.substring(0, 2)),
        filename = path.join(dirname, id.substring(2));

    logger.info(`storing data in the blob: ${id}`);

    // store the data and return the hash
    this._verifyExists();
    return Q.nfcall(fse.ensureDir, dirname)
        .then(() => {
            if (!exists.sync(filename)) {
                return Q.nfcall(fs.writeFile, filename, data);
            } else {
                logger.trace(`data already stored. skipping write ${id}`);
                return Q();
            }
        })
        .then(() => id)
        .fail(err => {
            logger.error(`Could not write to ${filename}: ${err}`);
            throw err;
        });
};

BlobStorage.prototype.get = function(id) {
    var dirname = path.join(this.baseDir, id.substring(0, 2)),
        filename = path.join(dirname, id.substring(2));

    // get the data from the given hash
    return Q.nfcall(fs.readFile, filename, 'utf8')
        .fail(err => {
            logger.error(`Could not read from ${filename}: ${err}`);
            throw err;
        });
};

module.exports = new BlobStorage();

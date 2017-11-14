const BlobBackend = require('./backend');
const fse = require('fs-extra');
const path = require('path');
const BASE_DIR = process.env.NETSBLOX_BLOB_DIR ||
        path.join(__dirname, '..', '..', '..', '..', 'blob-storage');

// TODO: create the logger
class FsBackend extends BlobBackend {

    configure(baseDir) {
        this.baseDir = baseDir || BASE_DIR;
    }

    getName() {
        return `fs`;
    }

    put(type, uuid, data) {
        let typeDir = path.join(this.baseDir, type);
        let filename = path.join(typeDir, uuid);
        return fse.ensureDir(typeDir)
            .then(() => fse.writeFile(filename, data))
            .then(() => path.join(type, uuid));
    }

    get(type, uuid) {
        let filename = path.join(this.baseDir, type, uuid);
        return fse.readFile(filename, 'utf8')
            .catch(err => {
                logger.error(`Could not read from ${filename}: ${err}`);
                throw err;
            });
    }

    exists(type, uuid) {
        let filename = path.join(this.baseDir, type, uuid);
        return fse.pathExists(filename);
    }

    delete(type, uuid) {
        let filename = path.join(this.baseDir, type, uuid);
        return fse.remove(filename);
    }
}

module.exports = FsBackend;

class BlobBackend {

    constructor(logger) {
        this.logger = logger.fork(this.getName());
        this.configure();
    }

    configure(options) {
        // abstract (for testing)
    }

    exists(type, uuid) {
        // abstract
    }

    get(type, uuid) {
        // abstract
    }

    put(type, uuid, data) {
        // abstract
    }

    delete(type, uuid) {
        // abstract
    }
}

module.exports = BlobBackend;

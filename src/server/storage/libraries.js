const LibraryStorage = {};

LibraryStorage.init = function (_logger, db) {
    this.logger = _logger.fork('libraries');
    this.collection = db.collection('libraries');
};

module.exports = LibraryStorage;

// Database for rpc's
//
// "Stateless"/Shared RPC's share the main Storage collection
//
// Stateful RPC's have a "Store" created for each instance
(function(Storage) {
    var GenStorage = require('../storage/generic-storage'),
        storage,
        logger,
        db;

    Storage.init = function(_logger, _db) {
        db = _db;
        logger = _logger;
        storage = new GenStorage(_logger, _db, 'rpc:shared');
    };

    Storage.save = function(key, value) {
        return storage.save(key, value);
    };

    Storage.get = function(key) {
        return storage.get(key);
    };

    Storage.delete = function(key) {
        return storage.delete(key);
    };

    ///////////////// Stateful, Room-based RPC's /////////////////
    Storage.create = function(name) {
        return new GenStorage(logger, db, ':rpc:' + name);
    };

})(exports);

// Database for rpc's
//
// "Stateless"/Shared RPC's share the main Storage collection
//
// Stateful RPC's have a "Store" created for each instance
(function(Storage) {
    var ObjectId = require('mongodb').ObjectId,
        shared,
        db,
        logger;

    Storage.init = function(_logger, _db) {
        logger = _logger.fork('RPC')
        db = _db;
        shared = _db.collection('netsblox:rpc:shared');
    };

    Storage.save = function(key, value) {
        var data = {
            _id: key,
            value
        };
        return shared.save(data)
            .then(result => {
                if (result.writeError) {
                    logger.error(`could not save to ${key}: ${result.errmsg}`);
                }
            });
    };

    Storage.get = function(key) {
        return shared.findOne({_id: key})
            .then(found => found && found.value)
            .catch(e => logger.error(`could not retrieve "${key}": ${e}`));
    };

    Storage.delete = function(key) {
        return shared.deleteOne({_id: key})
            .catch(e => logger.error(`could not retrieve "${key}": ${e}`));
    };

    ///////////////// Stateful, Room-based RPC's /////////////////
    Storage.create = function(name) {
        return new Store(name);
    };

    var Store = function(name) {
        this._db = db.collection('netsblox:rpc:' + name);
        this._logger = logger.fork(name);
    };

})(exports);

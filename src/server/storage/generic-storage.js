var Storage = function(_logger, _db, name) {
    this.logger = _logger.fork(name.toLowerCase());
    this.db = _db;
    this.collection = _db.collection(name);
};

Storage.prototype.save = function(key, value) {
    const query = {_id: key};
    return this.collection.updateOne(query, {$set: {value}}, {upsert: true})
        .then(result => {
            if (result.writeError) {
                this.logger.error(`could not save to ${key}: ${result.errmsg}`);
            }
        });
};

Storage.prototype.get = function(key) {
    return this.collection.findOne({_id: key})
        .then(found => found && found.value)
        .catch(e => this.logger.error(`could not retrieve "${key}": ${e}`));
};

Storage.prototype.delete = function(key) {
    return this.collection.deleteOne({_id: key})
        .catch(e => this.logger.error(`could not retrieve "${key}": ${e}`));
};

Storage.prototype.all = function() {
    return this.collection.find({}).toArray();
};

Storage.prototype.clearAll = function() {
    return this.collection.deleteMany({});
};

module.exports = Storage;

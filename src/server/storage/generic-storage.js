var Storage = function(_logger, _db, name) {
    this.logger = _logger.fork(name);
    this.db = _db;
    this.collection = _db.collection('netsblox:storage:' + name);
};

Storage.prototype.save = function(key, value) {
    var data = {
        _id: key,
        value
    };
    return this.collection.save(data)
        .then(result => {
            if (result.writeError) {
                this.logger.error(`could not save to ${key}: ${result.errmsg}`);
            }
        });
};

Storage.prototype.get = function(key) {
    this.logger.trace('getting ' + key);
    return this.collection.findOne({_id: key})
        .then(found => found && found.value)
        .catch(e => this.logger.error(`could not retrieve "${key}": ${e}`));
};

Storage.prototype.getMany = function(keys) {
    var query = {
            $or: keys.map(key => {
                return {
                    _id: key
                };
            })
        },
        stream = this.collection.find(query);

    return new ChainableDataStream(stream);
};

Storage.prototype.delete = function(key) {
    this.logger.trace('deleting ' + key);
    return this.collection.deleteOne({_id: key})
        .catch(e => this.logger.error(`could not retrieve "${key}": ${e}`));
};

Storage.prototype.all = function() {
    this.logger.trace('requesting all values');
    var stream = this.collection.find({});

    return new ChainableDataStream(stream);
};

Storage.prototype.clearAll = function() {
    this.logger.trace('clearing all values');
    return this.collection.deleteMany({});
};

var ChainableDataStream = function(stream) {
    this._stream = stream;
    this._transformers = [];

    stream.on('data', doc => {
        this._transformers.reduce((data, fn) => {
            return fn(data) || data;
        }, doc);
    });

    stream.once('end', doc => {
        if (this._end) {
            this._end(doc);
        }
    });
};

ChainableDataStream.prototype.transform = function(transformer) {
    this._transformers.push(transformer);
    return this;
};

ChainableDataStream.prototype.then = function(end) {
    this._end = end;
    return this;
};

module.exports = Storage;

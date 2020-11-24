// This is a wrapper for data from storage that implements
// save(), destroy() and (optionally) prepare() functions
'use strict';
var ObjectId = require('mongodb').ObjectId,
    Q = require('q');

class Data {
    constructor (db, data) {
        this._db = db;
        this._deleted = false;
        // copy everything in "data" to the object
        var keys = Object.keys(data);
        for (var i = keys.length; i--;) {
            this[keys[i]] = data[keys[i]];
        }
    }

    save(opts={}) {
        return Q().then(() => this.prepare())
            .then(() => {
                let data = this._saveable();

                if (!opts.silent)
                    this._logger.trace('saving', this.pretty());
                return this._db.updateOne(this.getStorageId(), {$set: data}, {upsert: true});
            })
            .then(result => {
                if (result.writeError) {
                    this._logger.error('could not save to database: ' + result.errmsg);
                }
                return result.result;
            })
            .catch(err => {
                this._logger.error(`save failed for ${this.name || this.username}: ${err}`);
                throw err;
            });
    }

    prepare() {
    }

    getStorageId() {
        return {_id: ObjectId(this._id)};
    }

    _saveable() {
        var result = {},
            keys = Object.keys(this)
                .filter(key => this.IGNORE_KEYS.indexOf(key) === -1);

        keys.forEach(key => result[key] = this[key]);

        return result;
    }

    isDeleted() {
        return this._deleted;
    }

    destroy() {
        this._deleted = true;
        this._logger.info(`destroying data ${JSON.stringify(this.getStorageId())}`);
        return this._db.deleteOne(this.getStorageId());
    }

    pretty() {
        return this._saveable();
    }
}

Data.prototype.IGNORE_KEYS = ['_db', '_logger', '_deleted'];
module.exports = Data;

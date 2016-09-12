// This is a wrapper for data from storage that implements
// save(), destroy() and (optionally) prepare() functions
'use strict';
var ObjectId = require('mongodb').ObjectId;

class Data {
    constructor (db, data) {
        this._db = db;
        // copy everything in "data" to the object
        var keys = Object.keys(data);
        for (var i = keys.length; i--;) {
            this[keys[i]] = data[keys[i]];
        }
    }

    save() {
        var data;

        this.prepare();
        data = this._saveable();
        this._logger.trace('saving', this.pretty());
        return this._db.save(data)
            .then(result => {
                if (result.writeError) {
                    this._logger.error('could not save to database: ' + result.errmsg);
                }
            });
    }

    prepare() {
    }

    _saveable() {
        var result = {},
            keys = Object.keys(this)
                .filter(key => this.IGNORE_KEYS.indexOf(key) === -1);
        keys.forEach(key => result[key] = this[key]);

        return result;
    }

    destroy() {
        this._db.deleteOne({_id: ObjectId(this._id)});  // jshint ignore:line
    }

    pretty() {
        return this._saveable();
    }
}

Data.prototype.IGNORE_KEYS = ['_db', '_logger'];
module.exports = Data;

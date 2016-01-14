// This is a wrapper for data from storage that implements
// save(), destroy() and (optionally) prepare() functions
'use strict';

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
        this._db.save(data);
    }

    prepare() {
    }

    _saveable() {
        var result = {},
            keys = Object.keys(this)
                .filter(key => this.IGNORE_KEYS.indexOf(key) === -1);
        keys.forEach(key => result[key] = this[key]);

        // TODO: Do I need to do something special with ObjectId?
        return result;
    }

    destroy() {
        this._db.deleteOne({_id: ObjectId(this._id)});  // jshint ignore:line
    }
}

Data.prototype.IGNORE_KEYS = ['_db'];
module.exports = Data;

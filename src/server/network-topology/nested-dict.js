const _ = require('lodash');

class NestedDictWithDefaults {
    constructor() {
        this._contents = {};
    }

    get(...keys) {
        return this.getOr(...keys, undefined);
    }

    getOr(/*...keys, defValue*/) {
        const [keys, defValue] = this._prepArgs(...arguments);
        let value = this._contents;
        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];
            if (!value.hasOwnProperty(key)) {
                return defValue;
            }
            value = value[key];
        }
        return value;
    }

    getOrSet(/*...keys, defValue*/) {
        const [keys, defValue] = this._prepArgs(...arguments);
        const lastKey = keys.pop();
        const nestedDict = this._getNestedDict(keys);
        if (!nestedDict.hasOwnProperty(lastKey)) {
            nestedDict[lastKey] = defValue;
        }
        return nestedDict[lastKey];
    }

    set(/*...keys, value*/) {
        const [keys, value] = this._prepArgs(...arguments);
        const lastKey = keys.pop();
        const dict = this._getNestedDict(keys);
        dict[lastKey] = value;
    }

    delete(...keys) {
        const lastKey = keys.pop();
        const nestedDicts = [this._contents];
        for (let i = 0; i < keys.length; i++) {
            const dict = nestedDicts[i];
            const key = keys[i];
            if (!dict.hasOwnProperty(key)) {
                return;
            }
            nestedDicts.push(dict[key]);
        }
        const innerDict = nestedDicts.pop();
        delete innerDict[lastKey];

        const dictKeyPairs = _.zip(nestedDicts, keys);
        let len = 0;
        while (dictKeyPairs.length && len === 0) {
            const [dict, key] = dictKeyPairs.pop();
            len = Object.keys(dict[key]).length;
            if (len === 0) {
                delete dict[key];
            }
        }
    }

    _getNestedDict(keys) {
        const dict = keys.reduce((dict, key) => {
            if (!dict[key] || typeof dict[key] !== 'object') {
                dict[key] = {};
            }
            return dict[key];
        }, this._contents);
        return dict;
    }

    _prepArgs(...args) {
        const value = args[args.length-1];
        const keys = args.slice(0, arguments.length-1);
        return [keys, value];
    }
}

module.exports = NestedDictWithDefaults;

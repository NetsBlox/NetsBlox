// This is a key value store that can be used across tables
'use strict';

var debug = require('debug'),
    warn = debug('NetsBlox:RPCManager:KVStore:warn'),
    trace = debug('NetsBlox:RPCManager:KVStore:trace'),
    store = {},  // single, global key-value store
    SEP = '/';

var getKeys = key => key.split(SEP).filter(k => k !== '');  // rm empty strings

module.exports = {

    // This is very important => Otherwise it will try to instantiate this
    isStateless: true,

    // These next two functions are the same from the stateful RPC's
    getPath: function() {
        return '/kv-store';
    },

    getActions: function() {
        return [
            'get',
            'put',
            'delete',
            'parent',
            'child'
        ];
    },

    get: function(req, res) {
        var key = req.query.key,
            keys = getKeys(key),
            result = store,
            i = 0;

        while (result && i < keys.length) {
            result = result[keys[i]];
            if (!result) {
                warn(`invalid key: ${key} (get)`);
                return res.json(false);
            }
            i++;
        }
        if (typeof result === 'object') {
            warn(`invalid key: ${key} (get) -> key is an object`);
            return res.json(false);
        }
        trace(`retrieved value: ${key} -> ${result}`);
        return res.json(result);
    },

    put: function(req, res) {
        var key = req.query.key,
            value = req.query.value,
            keys = getKeys(key),
            result = store,
            i = 0;

        while (result && i < keys.length-1) {
            if (!result[keys[i]]) {  // create nonexistent keys
                result[keys[i]] = {};
            }
            result = result[keys[i]];
            i++;
        }
        result[keys[i]] = value;
        trace(`set "${key}" to "${value}"`);
        return res.json(result);
    },

    delete: function(req, res) {
        var key = req.query.key,
            keys = getKeys(key),
            result = store,
            i = 0;

        while (result && i < keys.length-1) {
            result = result[keys[i]];
            if (!result) {
                warn(`invalid key: ${key} (delete)`);
                return res.json(false);
            }
            i++;
        }

        if (typeof result === 'object') {
            delete result[keys[i]];
            return res.json(true);
        } else {
            warn(`invalid key: ${key} (delete)`);
            return res.json(false);
        }
    },

    parent: function(req, res) {
        var key = req.query.key,
            keys = getKeys(key);

        if (keys.length) {
            keys.pop();
        }
        
        return res.json('/' + keys.join(SEP));
    },

    child: function(req, res) {
        var key = req.query.key,
            keys = getKeys(key),
            result = store,
            i = 0;

        while (result && i < keys.length) {
            result = result[keys[i]];
            if (typeof result !== 'object') {
                warn(`invalid key: "${key}" (child)`);
                return res.json([]);
            }
            i++;
        }
        return res.json(
            Object.keys(result)
                .sort()
                .map(k => key + '/' + k)
        );
    }

    // dump/load data?
    // TODO
};

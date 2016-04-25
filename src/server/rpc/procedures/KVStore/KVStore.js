// This is a key value store that can be used across tables
'use strict';

var debug = require('debug'),
    store = {},  // single, global key-value store
    Storage = require('../../storage'),
    NAME = 'KeyValueStore',
    SEP = '/',
    logger;

var getKeys = key => key.split(SEP).filter(k => k !== '');  // rm empty strings

var getStore = function() {
    return Storage.get(NAME)
        .then(result => result || {});
};

var saveStore = function(store) {
    return Storage.save(NAME, store);
};

var KeyValueStore = {

    init: _logger => logger = _logger.fork(NAME),
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
            i = 0;

        logger.trace(`getting key "${key}"`);
        getStore()
            .then(result => {
                while (result && i < keys.length) {
                    result = result[keys[i]];
                    if (!result) {
                        logger.warn(`invalid key: ${key} (get)`);
                        return res.json(false);
                    }
                    i++;
                }

                if (typeof result === 'object') {
                    logger.warn(`invalid key: ${key} (get) -> key is an object`);
                    return res.json(false);
                }

                logger.trace(`retrieved value: ${key} -> ${result}`);
                return res.json(result);
            })
            .catch(err => {
                logger.error(`Could not retrieve key ${keys[0]}: ${err}`);
                return res.json(false);
            });

    },

    put: (req, res) => {
        var key = req.query.key,
            value = req.query.value,
            keys = getKeys(key);

        logger.trace(`Looking up key "${key}"`)
        getStore()
            .then(store => {
                var result = store,
                    i = 0;

                while (result && i < keys.length-1) {
                    if (!result[keys[i]]) {  // create nonexistent keys
                        result[keys[i]] = {};
                    }
                    result = result[keys[i]];
                    i++;
                }

                result[keys[i]] = value;

                logger.trace(`about to save ${JSON.stringify(store)}`);
                return saveStore(store);
            })
            .then(result => {
                logger.trace(`set "${key}" to "${value}"`);
                return res.json(result);
            })
            .catch(err => {
                logger.error(`Could not save key "${key}": ${err}`);
                return res.json(false);
            });
    },

    delete: function(req, res) {
        var key = req.query.key,
            keys = getKeys(key),
            i = 0;

        getStore()
            .then(result => {
                while (result && i < keys.length-1) {
                    result = result[keys[i]];
                    if (!result) {
                        logger.warn(`invalid key: ${key} (delete)`);
                        return res.json(false);
                    }
                    i++;
                }

                if (typeof result !== 'object') {
                    logger.warn(`invalid key: ${key} (delete)`);
                    return res.json(false);
                }

                delete result[keys[i]];
                logger.trace(`successfully removed key ${key}`);
                return saveStore(result);
            })
            .then(() => res.json(true))
            .catch(e => logger.error(`deleting ${key} failed: ${e}`));
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

        getStore()
            .then(result => {
                while (result && i < keys.length) {
                    result = result[keys[i]];
                    if (typeof result !== 'object') {
                        logger.warn(`invalid key: "${key}" (child)`);
                        return res.json([]);
                    }
                    i++;
                }
                return res.json(
                    Object.keys(result)
                        .sort()
                        .map(k => key + '/' + k)
                );
            })
            .catch(e => logger.error(`getting children failed: ${e}`));
    }

    // dump/load data?
    // TODO
};

module.exports = KeyValueStore;

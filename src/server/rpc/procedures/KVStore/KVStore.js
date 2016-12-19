// This is a key value store that can be used across tables
'use strict';

var debug = require('debug'),
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

    get: function(key) {
        var keys = getKeys(key),
            i = 0;

        logger.trace(`getting key "${key}"`);
        getStore()
            .then(result => {
                while (result && i < keys.length) {
                    result = result[keys[i]];
                    if (!result) {
                        logger.warn(`invalid key: ${key} (get)`);
                        return this.response.json(false);
                    }
                    i++;
                }

                if (typeof result === 'object') {
                    logger.warn(`invalid key: ${key} (get) -> key is an object`);
                    return this.response.json(false);
                }

                logger.trace(`retrieved value: ${key} -> ${result}`);
                return this.response.json(result);
            })
            .catch(err => {
                logger.error(`Could not retrieve key ${keys[0]}: ${err}`);
                return this.response.json(false);
            });

        return null;
    },

    put: (key, value) => {
        var keys = getKeys(key);

        logger.trace(`Looking up key "${key}"`);
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
                return this.response.json(result);
            })
            .catch(err => {
                logger.error(`Could not save key "${key}": ${err}`);
                return this.response.json(false);
            });

        return null;
    },

    delete: function(key) {
        var keys = getKeys(key),
            i = 0;

        getStore()
            .then(result => {
                while (result && i < keys.length-1) {
                    result = result[keys[i]];
                    if (!result) {
                        logger.warn(`invalid key: ${key} (delete)`);
                        return this.response.json(false);
                    }
                    i++;
                }

                if (typeof result !== 'object') {
                    logger.warn(`invalid key: ${key} (delete)`);
                    return this.response.json(false);
                }

                delete result[keys[i]];
                logger.trace(`successfully removed key ${key}`);
                return saveStore(result);
            })
            .then(() => this.response.json(true))
            .catch(e => logger.error(`deleting ${key} failed: ${e}`));

        return null;
    },

    parent: function(key) {
        var keys = getKeys(key);

        if (keys.length) {
            keys.pop();
        }
        
        return '/' + keys.join(SEP);
    },

    child: function(key) {
        var keys = getKeys(key),
            i = 0;

        getStore()
            .then(result => {
                while (result && i < keys.length) {
                    result = result[keys[i]];
                    if (typeof result !== 'object') {
                        logger.warn(`invalid key: "${key}" (child)`);
                        return this.response.json([]);
                    }
                    i++;
                }
                return this.response.json(
                    Object.keys(result)
                        .sort()
                        .map(k => key + '/' + k)
                );
            })
            .catch(e => logger.error(`getting children failed: ${e}`));

        return null;
    }

    // dump/load data?
    // TODO
};

module.exports = KeyValueStore;

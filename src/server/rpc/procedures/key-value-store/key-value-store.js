// This is a key value store that can be used across tables
'use strict';

const logger = require('../utils/logger')('key-value-store');
var Storage = require('../../storage'),
    NAME = 'KeyValueStore',
    SEP = '/';

var getKeys = key => key.split(SEP).filter(k => k !== '');  // rm empty strings

var getStore = function() {
    return Storage.get(NAME)
        .then(result => result || {});
};

var saveStore = function(store) {
    return Storage.save(NAME, store);
};

const validateKeys = function(keys) {
    const validName = /^[\w _()-]+$/;
    keys.forEach(key => {
        if (!validName.test(key)) {
            throw new Error(`Invalid key: ${key}`);
        }
    });
};

const KeyValueStore = {};

KeyValueStore.get = function(key) {
    var keys = getKeys(key),
        response = this.response,
        i = 0;

    logger.trace(`getting key "${key}"`);
    getStore()
        .then(result => {
            while (result && i < keys.length) {
                result = result[keys[i]];
                if (!result) {
                    logger.warn(`invalid key: ${key} (get)`);
                    return response.json(false);
                }
                i++;
            }

            if (typeof result === 'object') {
                if (Array.isArray(result)) {
                    return response.json(result);
                }
                logger.warn(`invalid key: ${key} (get) -> key is an object`);
                return response.json(false);
            }

            logger.trace(`retrieved value: ${key} -> ${result}`);
            return response.json(result);
        })
        .catch(err => {
            logger.error(`Could not retrieve key ${keys[0]}: ${err}`);
            return response.json(false);
        });

    return null;
};

KeyValueStore.put = function(key, value) {
    var keys = getKeys(key),
        response = this.response;

    logger.trace(`Looking up key "${key}"`);

    validateKeys(keys);
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
            return response.json(result);
        })
        .catch(err => {
            logger.error(`Could not save key "${key}": ${err}`);
            return response.json(false);
        });

    return null;
};

KeyValueStore.delete = function(key) {
    var keys = getKeys(key),
        response = this.response,
        i = 0;

    getStore()
        .then(result => {
            while (result && i < keys.length-1) {
                result = result[keys[i]];
                if (!result) {
                    logger.warn(`invalid key: ${key} (delete)`);
                    return response.json(false);
                }
                i++;
            }

            if (typeof result !== 'object') {
                logger.warn(`invalid key: ${key} (delete)`);
                return response.json(false);
            }

            delete result[keys[i]];
            logger.trace(`successfully removed key ${key}`);
            return saveStore(result);
        })
        .then(() => response.json(true))
        .catch(e => logger.error(`deleting ${key} failed: ${e}`));

    return null;
};

KeyValueStore.parent = function(key) {
    var keys = getKeys(key);

    if (keys.length) {
        keys.pop();
    }
    
    return '/' + keys.join(SEP);
};

KeyValueStore.child = function(key) {
    var keys = getKeys(key),
        response = this.response,
        i = 0;

    getStore()
        .then(result => {
            while (result && i < keys.length) {
                result = result[keys[i]];
                if (typeof result !== 'object') {
                    logger.warn(`invalid key: "${key}" (child)`);
                    return response.json([]);
                }
                i++;
            }
            return response.json(
                Object.keys(result)
                    .sort()
                    .map(k => key + '/' + k)
            );
        })
        .catch(e => logger.error(`getting children failed: ${e}`));

    return null;
};

KeyValueStore.COMPATIBILITY = {
    path: 'kv-store'
};

module.exports = KeyValueStore;

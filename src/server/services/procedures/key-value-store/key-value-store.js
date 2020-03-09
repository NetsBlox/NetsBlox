/**
 * The KeyValueStore Service provides basic storage functionality using a hierarchical
 * key-value storage (similar to CloudVariables).
 *
 * @service
 */
'use strict';

const logger = require('../utils/logger')('key-value-store');
const Storage = require('../../storage');
const NAME = 'KeyValueStore';
const SEP = '/';
const PASSWORD_KEY = '__p';
const VALUE_KEY = '__v';
const RESERVED_KEY_NAMES = [PASSWORD_KEY, VALUE_KEY];

const getKeys = key => key.split(SEP).filter(k => k !== '');  // rm empty strings

let StorageData = null;
let getStorageData = null;
const getStore = async function() {
    if (!StorageData) {
        if (!getStorageData) {
            getStorageData = Storage.get(NAME)
                .then(data => data || {});
        }
        StorageData = await getStorageData;
    }
    return StorageData;
};

const ensureAuthorized = function(result, password) {
    if (result[PASSWORD_KEY]) {
        if (result[PASSWORD_KEY] !== password) {
            throw new Error('Unauthorized: incorrect password');
        }
        return true;
    }
    return false;
};

const getValue = function(result) {
    if (result[VALUE_KEY]) {
        return result[VALUE_KEY];
    }
    return result;
};

const throwKeyNotFound = function(keyName) {
    throw new Error(`Key not found: ${keyName}`);
};

const saveStore = function(store) {
    return Storage.save(NAME, store);
};

const validateKeys = function(keys) {
    const validName = /^[\w _()-]+$/;
    keys.forEach(key => {
        if (!validName.test(key)) {
            throw new Error(`Invalid key name: ${key}`);
        }
        if (RESERVED_KEY_NAMES.includes(key)) {
            throw new Error(`Invalid key name: ${key}`);
        }
    });
};

const formatChildKeys = function(key, data) {
    const childKeys = Object.keys(data);
    return childKeys.sort()
        .filter(key => !RESERVED_KEY_NAMES.includes(key))
        .map(k => key + '/' + k);
};

const KeyValueStore = {};

/**
 * Get the stored value
 * @param {String} key Fetch value for the given key
 * @param {String=} password Password (if password-protected)
 */
KeyValueStore.get = async function(key, password) {
    const keys = getKeys(key);
    let i = 0;

    logger.trace(`getting key "${key}"`);
    let result = await getStore();
    while (result && i < keys.length) {
        if (!result.hasOwnProperty(keys[i])) {
            throwKeyNotFound(key);
        }
        result = result[keys[i]];

        ensureAuthorized(result, password);
        i++;
    }

    result = getValue(result);
    if (typeof result === 'object') {
        if (Array.isArray(result)) {
            return result;
        }
        return formatChildKeys(key, result);
    }

    logger.trace(`retrieved value: ${key} -> ${result}`);
    return result;
};

/**
 * Set the stored value
 * @param {String} key Key to use for retrieving the variable
 * @param {Any} value Value to associated with key
 * @param {String=} password Password (if password-protected)
 */
KeyValueStore.put = async function(key, value, password) {
    const keys = getKeys(key);
    let isPasswordUsed = false;

    logger.trace(`Looking up key "${key}"`);

    validateKeys(keys);
    const store = await getStore();
    let result = store,
        i = 0;

    while (result && i < keys.length-1) {
        if (!result.hasOwnProperty(keys[i])) {  // create nonexistent keys
            result[keys[i]] = {};
        }
        isPasswordUsed = isPasswordUsed || ensureAuthorized(result, password);
        result = result[keys[i]];
        i++;
    }

    const entry = result[keys[i]] || {};
    entry[VALUE_KEY] = value;
    if (password && !isPasswordUsed) {
        entry[PASSWORD_KEY] = password;
    }
    result[keys[i]] = entry;

    logger.trace(`about to save ${JSON.stringify(store)}`);
    return await saveStore(store);
};

/**
 * Delete the stored value
 * @param {String} key Key to remove from store
 * @param {String=} password Password (if password-protected)
 */
KeyValueStore.delete = async function(key, password) {
    const keys = getKeys(key);
    let i = 0;

    let result = await getStore();
    while (result && i < keys.length-1) {
        result = result[keys[i]];
        if (!result) {
            throwKeyNotFound(key);
        }
        ensureAuthorized(result, password);
        i++;
    }

    if (typeof result !== 'object') {
        throwKeyNotFound(key);
    }

    delete result[keys[i]];
    logger.trace(`successfully removed key ${key}`);
    await saveStore(result);
    return true;
};

/**
 * Get the ID of the parent key.
 * @param {String} key
 */
KeyValueStore.parent = function(key) {
    var keys = getKeys(key);

    if (keys.length) {
        keys.pop();
    }

    return '/' + keys.join(SEP);
};

/**
 * Get the IDs of the child keys.
 * @param {String} key
 * @param {String=} password Password (if password-protected)
 */
KeyValueStore.child = async function(key, password) {
    let result = await getStore();
    const keys = getKeys(key);
    let i = 0;
    while (result && i < keys.length) {
        result = result[keys[i]];
        if (typeof result !== 'object') {
            throwKeyNotFound(key);
        }
        ensureAuthorized(result, password);
        i++;
    }

    return formatChildKeys(key, result);
};

KeyValueStore.COMPATIBILITY = {
    path: 'kv-store'
};

module.exports = KeyValueStore;

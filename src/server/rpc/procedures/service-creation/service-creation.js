const _ = require('lodash');
const Blocks = require('./blocks');
const Storage = require('../../storage');
const ServiceEvents = require('../utils/service-events');
let mongoCollection = null;
const getDatabase = function() {
    if (!mongoCollection) {
        mongoCollection = Storage.createCollection('netsblox:services:community');
    }
    return mongoCollection;
};

const ServiceCreation = {};

const validateDataset = data => {
    if (!Array.isArray(data[0])) {  // TODO: Should this be move to a new datatype?
        throw new Error('"data" must be a list of lists.');
    }
};

const toUpperCamelCase = name => {
    const words = name.split(/[^a-zA-Z0-9]/);
    return words.map(word => word[0].toUpperCase() + word.slice(1)).join('');
};

const ensureLoggedIn = function(caller) {
    if (!caller.username) {
        throw new Error('Login required.');
    }
};

const isAuthorized = (caller, service) => {
    return !service || caller.username === service.author;
};

const fs = require('fs');
const path = require('path');
const normalizeServiceName = name => name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
const RESERVED_SERVICE_NAMES = fs.readdirSync(path.join(__dirname, '..'))
    .map(normalizeServiceName);

const isValidServiceName = name => {
    return !RESERVED_SERVICE_NAMES.includes(normalizeServiceName(name));
};

/**
 * Get the default settings for a given dataset.
 *
 * @param {Array} data 2D list of data
 */
ServiceCreation.getCreateFromTableOptions = function(data) {
    ensureLoggedIn(this.caller);
    validateDataset(data);

    const fields = data[0];
    const indexField = fields[0];
    const rpcOptions = fields.slice(1).map((field, i) => {
        const column = i + 2;
        return {
            name: `get${toUpperCamelCase(field)}Data`,
            help: `Get ${field} data for the given ${indexField}`,
            query: Blocks.query({field: indexField, column}),
            transform: Blocks.transform({field: indexField, column}),
        };
    });

    const getIndexFieldRPC = {
        name: `getAll${toUpperCamelCase(indexField)}Values`,
        help: `Get ${indexField} values with data available.`,
        code: Blocks.getIndexFieldValues({field: indexField}),
    };

    rpcOptions.push(getIndexFieldRPC);
    return {
        help: `Dataset uploaded by ${this.caller.username}`,
        RPCs: rpcOptions
    };
};

const validateOptions = options => {
    if (!options.RPCs || !Array.isArray(options.RPCs)) {
        throw new Error('"options" is not valid. "RPCs" must be a list.');
    }

    if (options.RPCs.length === 0) {
        throw new Error('"options" is not valid. Cannot have empty list of RPCs');
    }

    options.RPCs.forEach(rpc => {
        const {name='RPC'} = rpc;
        if (!rpc.code && !rpc.query) {
            throw new Error(`"options" is not valid. ${name} needs either "code" or "query"`);
        }
    });
};

const resolveOptions = (options, defaultOptions) => {
    if (options) {
        if (options.RPCs) {
            options.RPCs = options.RPCs.map(rpc => {
                const rpcPairs = rpc.filter(pair => pair && pair.length);
                return _.fromPairs(rpcPairs);
            });
        }
        validateOptions(options);
    }

    return Object.assign({}, defaultOptions, options);
};

const getBlockArgs = blockXml => {
    const inputs = blockXml.split(/<\/?inputs>/, 2).pop()
        .split(/<\/?input>/g).filter(arg => !!arg);
    return inputs;
};

/**
 * Create a service using a given dataset.
 *
 * @param {String} name Service name
 * @param {Array} data 2D list of data
 * @param {Object=} options Options (for details, check out `getCreateFromTableOptions`)
 */
ServiceCreation.createServiceFromTable = async function(name, data, options) {
    ensureLoggedIn(this.caller);
    const defaultOptions = this.getCreateFromTableOptions(data);
    options = resolveOptions(options, defaultOptions);

    const methods = options.RPCs.map(rpc => {
        const {name, help='', code, query, transform} = rpc;
        const method = {name, help};

        if (code) {
            method.arguments = getBlockArgs(code);
            method.code = code;
        } else {  // use query and transform instead
            method.query = {
                arguments: getBlockArgs(query),
                code: query
            };
            if (transform) {
                method.transform = {
                    arguments: getBlockArgs(transform),
                    code: transform
                };
            }
            method.arguments = method.query.arguments.slice();
        }
        method.arguments.pop();  // remove the "data" argument

        return method;
    });

    const service = {
        name,
        type: 'DataService',
        help: options.help,
        author: this.caller.username,
        createdAt: new Date(),
        data,
        methods,
    };

    const storage = getDatabase();
    const existingService = await storage.findOne({name});
    if (!isAuthorized(this.caller, existingService) || !isValidServiceName(name)) {
        throw new Error(`Service with name "${name}" already exists. Please choose a different name.`);
    }
    
    const query = {$set: service};
    await storage.updateOne({name}, query, {upsert: true});
    ServiceEvents.emit(ServiceEvents.UPDATE, name);
};

/**
 * Delete an existing service.
 *
 * @param {String} name Service name
 */
ServiceCreation.deleteService = async function(name) {
    ensureLoggedIn(this.caller);
    const storage = getDatabase();
    const existingService = await storage.findOne({name});
    if (!isAuthorized(this.caller, existingService)) {
        throw new Error(`Not allowed to delete ${name}. Only the author can do that!`);
    }
    await storage.deleteOne({name, author: this.caller.username});
    ServiceEvents.emit(ServiceEvents.DELETE, name);
    return 'OK';
};

module.exports = ServiceCreation;

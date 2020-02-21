/**
 *
 * The ServiceCreation Service enables users to create custom services. Custom
 * Services can be found under the "Community" section using the `call <RPC>`
 * block.
 *
 * @alpha
 * @service
 */
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
    if (!Array.isArray(data[0])) {  // TODO: Should this be moved to a new datatype?
        throw new Error('"data" must be a list of lists.');
    }
};

const toUpperCamelCase = name => {
    const words = name.split(/[^a-zA-Z0-9\u00C0-\u02A0#$%]/);
    return words
        .filter(word => !!word)
        .map(word => word[0].toUpperCase() + word.slice(1)).join('');
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
const MONGODB_DOC_TOO_LARGE = 'Attempt to write outside buffer bounds';

const isValidServiceName = name => {
    return !RESERVED_SERVICE_NAMES.includes(normalizeServiceName(name));
};

const getVariableNameForData = names => {
    const basename = 'data';
    let i = 2;
    let name = basename;
    while (names.includes(name)) {
        name = `${basename}_${i}`;
        i++;
    }
    return name;
};

ServiceCreation._getConstantFields = function(data) {
    const fields = data[0];
    const constantColumns = fields.map((_, i) => i);
    constantColumns.shift();  // ID is trivially constant

    const fieldValues = {};

    for (let i = data.length; i > 0; i--) {
        const record = data[i];
        if (!record || !record.length) continue;

        const id = record[0];
        if (!fieldValues[id]) {
            fieldValues[id] = record;
        } else {
            const prevValues = fieldValues[id];
            for (let c = constantColumns.length; c--;) {
                const column = constantColumns[c];
                if (prevValues[column] !== record[column]) {
                    constantColumns.splice(c, 1);
                }
            }
        }
    }

    return constantColumns.map(c => fields[c]);
};

ServiceCreation._hasUniqueIndexField = function(data) {
    const indices = {};
    for (let i = data.length; i > 0; i--) {
        if (!data[i] || !data[i].length) continue;
        const id = data[i][0];
        if (indices[id]) {
            return false;
        }
        indices[id] = true;
    }
    return true;
};

ServiceCreation._cleanDataset = data => {
    return data.filter(line => !!line)
        .map(row => row.map(item => item.trim()));
};

/**
 * Get the default settings for a given dataset.
 *
 * @param {Array} data 2D list of data
 */
ServiceCreation.getCreateFromTableOptions = function(data) {
    ensureLoggedIn(this.caller);
    data = this._cleanDataset(data);
    validateDataset(data);

    const fields = data[0];
    const indexField = fields[0];
    const dataVariable = getVariableNameForData(fields);
    const rpcOptions = [];

    if (this._hasUniqueIndexField(data)) {
        fields.forEach((field, index) => {
            const column = index + 1;
            rpcOptions.push({
                name: `get${toUpperCamelCase(field)}Column`,
                help: `Get ${field} values with data available.`,
                query: Blocks.reportTrue(),
                transform: Blocks.transform({column}),
            });

            if (index > 0) {
                rpcOptions.push({
                    name: `get${toUpperCamelCase(field)}By${toUpperCamelCase(indexField)}`,
                    help: `Get ${field} values with data available.`,
                    query: Blocks.reportTrue(),
                    transform: Blocks.getColumns({column}),
                });
            }
        });
        rpcOptions.push({
            name: 'getValue',
            help: `Get value given a ${indexField} value and column name.`,
            code: Blocks.getValue({fields, dataVariable}),
        });
    } else {
        const column = 1;
        const constantFields = this._getConstantFields(data);
        const getFieldsByIndexField = fields.slice(1).map((field, i) => {
            const column = i + 2;
            if (constantFields.includes(field)) {
                return {
                    name: `get${toUpperCamelCase(field)}For${toUpperCamelCase(indexField)}`,
                    help: `Get the ${field} for the given ${indexField}`,
                    code: Blocks.getColumnFromFirst({field: indexField, column, dataVariable}),
                };
            } else {
                return {
                    name: `get${toUpperCamelCase(field)}`,
                    help: `Get ${field} data for the given ${indexField}`,
                    query: Blocks.query({field: indexField, column, dataVariable}),
                    transform: Blocks.transform({field: indexField, column}),
                };
            }
        });
        rpcOptions.push(...getFieldsByIndexField);

        const getIndexFieldRPC = {
            name: `getAll${toUpperCamelCase(indexField)}Values`,
            help: `Get ${indexField} values with data available.`,
            query: Blocks.reportTrue(),
            transform: Blocks.transform({column}),
            combine: Blocks.combineIfUnique(),
        };
        rpcOptions.push(getIndexFieldRPC);
    }

    if (data.length < 2000) {
        rpcOptions.push({
            name: 'getTable',
            help: 'Get the entire dataset as a table',
            code: Blocks.getTable({fields})
        });
    }

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
        .split(/<\/?input>/g)
        .map(arg => arg.trim())
        .filter(arg => !!arg);
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
        const {name, help='', code, query, transform, combine} = rpc;
        const method = {name, help};

        if (code) {
            method.arguments = getBlockArgs(code).slice(0, -1);
            method.code = code;
        } else {  // use query and transform instead
            method.query = {
                arguments: getBlockArgs(query),
                code: query
            };
            method.arguments = method.query.arguments.slice(0, -1);
            if (transform) {
                method.transform = {
                    arguments: getBlockArgs(transform),
                    code: transform
                };
                method.arguments.push(...method.transform.arguments.slice(0, -1));
            }
            if (combine) {
                method.combine = {
                    arguments: getBlockArgs(combine),
                    code: combine
                };
                method.arguments.push(...method.combine.arguments.slice(0, -2));
            }
        }

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
    try {
        await storage.updateOne({name}, query, {upsert: true});
        ServiceEvents.emit(ServiceEvents.UPDATE, name);
    } catch (err) {
        if (err.message === MONGODB_DOC_TOO_LARGE) {
            throw new Error('Uploaded code is too large. Please decrease project (or dataset) size and try again.');
        }
        throw err;
    }
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
    return ServiceEvents.emit(ServiceEvents.DELETE, name).shift();
};

module.exports = ServiceCreation;

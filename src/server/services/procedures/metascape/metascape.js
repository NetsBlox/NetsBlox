/**
 *
 * The MetaScape Service enables remote devices to provide custom services. Custom
 * Services can be found under the "Community" section using the `call <RPC>`
 * block.
 *
 * @service
 */
const _ = require('lodash');
const dgram = require('dgram'),
    server = dgram.createSocket('udp4');
const logger = require('../utils/logger')('metascape');

const Storage = require('../../storage');
const ServiceEvents = require('../utils/service-events');
let mongoCollection = null;
const getDatabase = function() {
    if (!mongoCollection) {
        mongoCollection = Storage.createCollection('netsblox:services:community');
    }
    return mongoCollection;
};

const MetaScape = {};
MetaScape.serviceName = 'MetaScape';

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

const fs = require('fs');
const path = require('path');
const normalizeServiceName = name => name.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
const RESERVED_RPC_NAMES = ['serviceName', 'COMPATIBILITY'];
const RESERVED_SERVICE_NAMES = fs.readdirSync(path.join(__dirname, '..'))
    .map(normalizeServiceName);
const MONGODB_DOC_TOO_LARGE = 'Attempt to write outside buffer bounds';

const isValidServiceName = name => {
    !RESERVED_SERVICE_NAMES.includes(normalizeServiceName(name));
};

const isValidRPCName = name => 
    !(!name || name.startsWith('_') ||  RESERVED_RPC_NAMES.includes(name));

const validateOptions = options => {
    if (!options.RPCs || !Array.isArray(options.RPCs)) {
        throw new Error('"options" is not valid. "RPCs" must be a list.');
    }

    if (options.RPCs.length === 0) {
        throw new Error('"options" is not valid. Cannot have empty list of RPCs');
    }

    options.RPCs.forEach((rpc, i) => {
        const {name} = rpc;
        try {
            ensureValidRPCName(name);
            if (!rpc.code && !rpc.query) {
                throw new Error(`"options" is not valid. ${name} needs either "code" or "query"`);
            }
        } catch (err) {
            throw new Error(`RPC #${i} is invalid: ${err.message}`);
        }
    });
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
 * @param {String} definition Service definition
 */
MetaScape._createService = async function(definition) {    
    let parsed = JSON.parse(definition);
    const name = Object.keys(parsed)[0];

    logger.log(`Received definition for service ${name}`);

    parsed = parsed[name];
    const serviceInfo = parsed['service'];
    const methodsInfo = parsed['methods'];
    const eventsInfo = parsed['events'];

    const methods = Object.keys(methodsInfo).map(methodName => {
        const methodInfo = methodsInfo[methodName];

        const method = {name: methodName, help: methodInfo.documentation};

        // if (code) {
        //     method.arguments = getBlockArgs(code).slice(0, -1);
        //     method.code = code;
        // } else {  // use query and transform instead
        //     method.query = {
        //         arguments: getBlockArgs(query),
        //         code: query
        //     };
        //     method.arguments = method.query.arguments.slice(0, -1);
        //     if (transform) {
        //         method.transform = {
        //             arguments: getBlockArgs(transform),
        //             code: transform
        //         };
        //         method.arguments.push(...method.transform.arguments.slice(0, -1));
        //     }
        //     if (combine) {
        //         method.combine = {
        //             arguments: getBlockArgs(combine),
        //             code: combine
        //         };
        //         method.arguments.push(...method.combine.arguments.slice(0, -2));
        //         method.initialValue = initialValue;
        //     }
        // }

        return method;
    });

    const service = {
        name,
        type: 'DeviceService',
        help: serviceInfo.documentation,
        author: 'MetaScape',
        createdAt: new Date(),
        methods,
        /** socket, */
    };

    const storage = getDatabase();
    const existingService = await storage.findOne({name});
    if (!isValidServiceName(name)) {
        logger.warn(`Service with name "${name}" already exists.`);
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

server.on('listening', function () {
    var local = server.address();
    logger.log('listening on ' + local.address + ':' + local.port);
});

server.on('message', function (message, remote) {
    MetaScape._createService(message);
});

/* eslint no-console: off */
if (process.env.METASCAPE_PORT) {
    console.log('ROBOSCAPE_PORT is ' + process.env.METASCAPE_PORT);
    server.bind(process.env.METASCAPE_PORT || 1975);
}

MetaScape.isSupported = function () {
    if (!process.env.METASCAPE_PORT) {
        console.log('METASCAPE_PORT is not set (to 1975), MetaScape is disabled');
    }
    return !!process.env.METASCAPE_PORT;
};

getDatabase().deleteMany({type: 'DeviceService'});

module.exports = MetaScape;

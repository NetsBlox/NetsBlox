/**
 *
 * The MetaScape Service enables remote devices to provide custom services. Custom
 * Services can be found under the "Community/Devices" section using the `call <RPC>`
 * block.
 *
 * @service
 */
const fs = require('fs');
const path = require('path');
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

/**
 * List of registered services, with a list of IDs and their respective hosts
 */
MetaScape._services = [];


/**
 * Creates or updates the connection information for a remote service
 * @param {String} name 
 * @param {String} id 
 * @param {RemoteInfo} rinfo 
 */
MetaScape._updateOrCreateService = function (name, id, rinfo) {
    var service = this._services[name];
    if (!service) {
        // Service not added yet
        logger.log('Discovering ' + name + ':' + id + ' at ' + rinfo.address + ':' + rinfo.port);
        service = {id: rinfo};
        this._services[name] = service;
    } else {
        // Add/update information for this device ID
        service[id] = rinfo;
    }
};

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

        const method = {name: methodName, documentation: methodInfo.documentation};

        method.arguments = methodInfo.params.map(param => { 
            return {
                name: param.name,
                optional: param.optional,
                documentation: param.documentation,
            };
        });
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
        description: serviceInfo.description,
        author: 'MetaScape',
        createdAt: new Date(),
        methods,
    };

    const storage = getDatabase();
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

// Clear old devices
getDatabase().deleteMany({type: 'DeviceService'});

module.exports = MetaScape;

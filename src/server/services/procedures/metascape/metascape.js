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
const MetaScapeServices = require('./metascape-services');

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

const MetaScape = {};
MetaScape.serviceName = 'MetaScape';

MetaScape._mongoCollection = null;
MetaScape._getDatabase = function() {
    if (!MetaScape._mongoCollection) {
        MetaScape._mongoCollection = Storage.createCollection('netsblox:services:community');
    }
    return MetaScape._mongoCollection;
};

/**
 * List IDs of devices associated for a service
 * @param {String} name Name of service to get device IDs for
 */
MetaScape.getDevices = function (name) {
    return MetaScapeServices.getDevices(name);
};

/**
 * List all MetaScape services registered with the server 
 */
MetaScape.getServices = function () {
    return MetaScapeServices.getServices();
};

/**
 * Create a service using a given definition.
 *
 * @param {String} definition Service definition
 * @param {RemoteInfo} remote Remote host information
 */
MetaScape._createService = async function(definition, remote) {    
    let parsed = JSON.parse(definition);
    const name = Object.keys(parsed)[0];
    
    parsed = parsed[name];
    const serviceInfo = parsed.service;
    const methodsInfo = parsed.methods;
    const eventsInfo = parsed.events;
    const version = serviceInfo.version;
    const id = parsed.id;

    logger.log(`Received definition for service ${name} v${version} from ID ${id}`);
    
    // Add getDevices method by default
    let methods = [{
        name: 'getDevices',
        documentation: 'Get a list of device IDs for this service',
        arguments: [],
    }, ...Object.keys(methodsInfo).map(methodName => {
        const methodInfo = methodsInfo[methodName];

        const method = {name: methodName, documentation: methodInfo.documentation};

        method.arguments = methodInfo.params.map(param => { 
            return {
                name: param.name,
                optional: param.optional,
                documentation: param.documentation,
            };
        });

        // Add ID argument to all non-getDevices methods
        method.arguments = [{
            name: 'id',
            optional: false,
            documentation: 'ID of device to send request to'
        }, ...method.arguments];

        return method;
    })];    

    // Add listen method by default
    methods.push({
        name: 'listen',
        documentation: 'Register for receiving messages from the given id',
        arguments: [{
            name: 'id',
            optional: false,
            documentation: 'ID of device to send request to'
        }],
    });

    const service = {
        name: name,
        type: 'DeviceService',
        description: serviceInfo.description,
        author: 'MetaScape',
        createdAt: new Date(),
        methods,
    };

    const storage = MetaScape._getDatabase();
    if (!isValidServiceName(name)) {
        logger.warn(`Service with name "${name}" already exists.`);
    }
    
    const query = {$set: service};
    try {
        await storage.updateOne({name}, query, {upsert: true});
        ServiceEvents.emit(ServiceEvents.UPDATE, name);
        MetaScapeServices.updateOrCreateServiceInfo(name, parsed, id, remote);
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
    MetaScape._createService(message, remote);
});

/* eslint no-console: off */
if (process.env.METASCAPE_PORT) {
    console.log('METASCAPE_PORT is ' + process.env.METASCAPE_PORT);
    
    // Clear old devices
    MetaScape._getDatabase().deleteMany({type: 'DeviceService'});

    server.bind(process.env.METASCAPE_PORT || 1975);
}

MetaScape.isSupported = function () {
    if (!process.env.METASCAPE_PORT) {
        console.log('METASCAPE_PORT is not set (to 1975), MetaScape is disabled');
    }
    return !!process.env.METASCAPE_PORT;
};

module.exports = MetaScape;

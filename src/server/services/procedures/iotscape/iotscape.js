/**
 *
 * The IoTScape Service enables remote devices to provide custom services. Custom
 * Services can be found under the "Community/Devices" section using the `call <RPC>`
 * block.
 *
 * @alpha
 * @service
 */
const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const dgram = require('dgram'),
    server = dgram.createSocket('udp4');

const logger = require('../utils/logger')('iotscape');
const Storage = require('../../storage');
const ServiceEvents = require('../utils/service-events');
const IoTScapeServices = require('./iotscape-services');

const normalizeServiceName = name => name.toLowerCase().replace(/[^a-z0-9]/g, '');
const RESERVED_RPC_NAMES = ['serviceName', 'COMPATIBILITY'];
const RESERVED_SERVICE_NAMES = fs.readdirSync(path.join(__dirname, '..'))
    .map(normalizeServiceName);
const MONGODB_DOC_TOO_LARGE = 'Attempt to write outside buffer bounds';

const isValidServiceName = name => !RESERVED_SERVICE_NAMES.includes(normalizeServiceName(name));

const isValidRPCName = name => 
    !(!name || name.startsWith('_') ||  RESERVED_RPC_NAMES.includes(name));

const IoTScape = {};
IoTScape.serviceName = 'IoTScape';

IoTScape._mongoCollection = null;
IoTScape._getDatabase = function() {
    if (!IoTScape._mongoCollection) {
        IoTScape._mongoCollection = Storage.createCollection('netsblox:services:community');
    }
    return IoTScape._mongoCollection;
};

/**
 * List IDs of devices associated for a service
 * @param {String} service Name of service to get device IDs for
 */
IoTScape.getDevices = function(service){
    if(!IoTScapeServices.serviceExists(service)){
        throw new Error('Service not found');
    }
    
    return IoTScapeServices.getDevices(service);
};

/**
 * List all IoTScape services registered with the server 
 */
IoTScape.getServices = IoTScapeServices.getServices;

/**
 * List the message types associated with a service
 * @param {string} service Name of service to get events for
 */
IoTScape.getMessageTypes = function(service){
    if(!IoTScapeServices.serviceExists(service)){
        throw new Error('Service not found');
    }
    
    return IoTScapeServices.getMessageTypes(service);
};

/**
 * Make a call to a device as a text command
 * @param {String} service Name of service to make call to
 * @param {String} id ID of device to make call to
 * @param {String} command Input to RPC
 */
IoTScape.send = function (service, id, command){

    if(!IoTScapeServices.serviceExists(service)){
        throw new Error('Service not found');
    }
    
    if(!IoTScapeServices.deviceExists(service, id)){
        throw new Error('Device not found');
    }

    let parts = command.split(/\s+/g);

    // Require at least a function name
    if(parts.length < 1){
        throw new Error('Command too short or invalid');
    }
    

    return IoTScapeServices.call(service, parts[0], id, ...parts.slice(1));
};

/**
 * Create a service using a given definition.
 *
 * @param {String} definition Service definition
 * @param {RemoteInfo} remote Remote host information
 */
IoTScape._createService = async function(definition, remote) {    
    let parsed = JSON.parse(definition);

    // Ignore request messages sent to this method
    if(parsed.request){
        return;
    }

    const name = Object.keys(parsed)[0];
    parsed = parsed[name];
    
    // Verify service definition in message
    if(parsed.service == undefined){
        return;
    }

    // Validate service name
    if(!isValidServiceName(name) || name.replace(/[^a-zA-Z0-9]/g, '') !== name){
        logger.log(`Service name ${name} rejected`);
        return;
    }

    const serviceInfo = parsed.service;
    const methodsInfo = parsed.methods;

    const version = serviceInfo.version;
    const id = parsed.id;

    logger.log(`Received definition for service ${name} v${version} from ID ${id}`);
    
    let methods = _generateMethods(methodsInfo);

    let service = {
        name: name,
        type: 'DeviceService',
        description: serviceInfo.description,
        author: 'IoTScape',
        createdAt: new Date(),
        methods,
        version: serviceInfo.version
    };

    
    // Handle merge for existing service
    service = await _mergeWithExistingService(name, service, methods);
    
    // Send to database
    const query = {$set: service};
    try {
        await IoTScape._getDatabase().updateOne({name}, query, {upsert: true});
        ServiceEvents.emit(ServiceEvents.UPDATE, name);
        IoTScapeServices.updateOrCreateServiceInfo(name, parsed, id, remote);
    } catch (err) {
        if (err.message === MONGODB_DOC_TOO_LARGE) {
            logger.log('Uploaded service is too large. Please decrease service size and try again.');
        }
        throw err;
    }
};

/**
 * Creates definitions for methods of an incoming service
 * @param {Object} methodsInfo Methods from parsed JSON data
 */
function _generateMethods(methodsInfo) {
    // Add getDevices and listen methods by default
    let methods = [{
        name: 'getDevices',
        documentation: 'Get a list of device IDs for this service',
        arguments: [],
        returns: {
            documentation: '',
            type: ['void']
        }
    }, 
    {
        name: 'listen',
        documentation: 'Register for receiving messages from the given id',
        arguments: [{
            name: 'id',
            optional: false,
            documentation: 'ID of device to send request to',
        }],
        returns: {
            documentation: '',
            type: ['void']
        }
    }, ...Object.keys(methodsInfo).map(methodName => {
        const methodInfo = methodsInfo[methodName];

        const method = { name: methodName, documentation: methodInfo.documentation, returns: methodInfo.returns };

        method.arguments = methodInfo.params.map(param => {
            let type = param.type === 'number' ? { name: 'Number', params: [] } : null;
            return {
                name: param.name,
                optional: param.optional,
                documentation: param.documentation,
                type
            };
        });

        // Add ID argument to all non-getDevices methods
        method.arguments = [{
            name: 'id',
            optional: false,
            documentation: 'ID of device to send request to',
        }, ...method.arguments];

        return method;
    })];

    return methods;
}

/**
 * Merges an incoming service with an existing version
 * @param {String} name Name of service to look for
 * @param {object} service Incoming service
 */
async function _mergeWithExistingService(name, service) {
    let existing = await IoTScape._getDatabase().findOne({ name });

    if (existing !== null) {
        let methodNames = _.uniq([
            ...service.methods.map(method => method.name),
            ...existing.methods.map(method => method.name)
        ]);

        // Validate methods
        methodNames = methodNames.filter(isValidRPCName);

        // Use newer methods if available
        service.methods = methodNames.map((name) => {
            const existingMethod = existing.methods.find(method => method.name === name);
            const incomingMethod = service.methods.find(method => method.name === name);

            if (existing.version >= service.version) {
                return existingMethod || incomingMethod;
            } else {
                return incomingMethod || existingMethod;
            }
        });

        // Use max of both versions
        if (existing.version > service.version) {
            service.version = existing.version;
        }
    }

    return service;
}

server.on('listening', function () {
    var local = server.address();
    logger.log('listening on ' + local.address + ':' + local.port);
});

server.on('message', function (message, remote) {
    IoTScape._createService(message, remote);
});

IoTScapeServices.start(server);

/* eslint no-console: off */
IoTScape.initialize = function () {
    console.log('IOTSCAPE_PORT is ' + process.env.IOTSCAPE_PORT);
    // Clear old devices
    IoTScape._getDatabase().deleteMany({type: 'DeviceService'});

    server.bind(process.env.IOTSCAPE_PORT || 1975);
};

IoTScape.isSupported = function () {
    if (!process.env.IOTSCAPE_PORT) {
        console.log('IOTSCAPE_PORT is not set (to 1975), IoTScape is disabled');
    }
    return !!process.env.IOTSCAPE_PORT;
};

module.exports = IoTScape;

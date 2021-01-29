/**
 *
 * The IoTScape Service enables remote devices to provide custom services. Custom
 * Services can be found under the "Community/Devices" section using the `call <RPC>`
 * block.
 *
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
 * @param {String} name Name of service to get device IDs for
 */
IoTScape.getDevices = IoTScapeServices.getDevices;

/**
 * List all IoTScape services registered with the server 
 */
IoTScape.getServices = IoTScapeServices.getServices;

/**
 * List the event types associated with a service
 * @param {string} name Name of service to get events for
 */
IoTScape.getEvents = IoTScapeServices.getEvents;

/**
 * Make a call to a device as a text command
 * @param {String} service Name of service to make call to
 * @param {String} id ID of device to make call to
 * @param {String} command Input to RPC
 */
IoTScape.send = function (service, id, command){
    let parts = command.split(/\s+/g);

    // Require at least a function name
    if(parts.length < 1){
        return false;
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
    
    // Add getDevices method by default
    let methods = [{
        name: 'getDevices',
        documentation: 'Get a list of device IDs for this service',
        arguments: [],
        returns: {
            documentation: '',
            type: ['void']
        }
    }, ...Object.keys(methodsInfo).map(methodName => {
        const methodInfo = methodsInfo[methodName];

        const method = {name: methodName, documentation: methodInfo.documentation, returns: methodInfo.returns};

        method.arguments = methodInfo.params.map(param => { 
            let type = param.type === 'number'? { name: 'Number', params: []} : null;
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

    // Add listen method by default
    methods.push({
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
    });

    const service = {
        name: name,
        type: 'DeviceService',
        description: serviceInfo.description,
        author: 'IoTScape',
        createdAt: new Date(),
        methods,
        version: serviceInfo.version
    };

    const storage = IoTScape._getDatabase();

    // Handle merge for existing service
    let existing = await storage.findOne({name});

    if(existing !== null){
        let methodNames = _.uniq([
            ...service.methods.map(method => method.name),
            ...existing.methods.map(method => method.name)
        ]);

        // Validate methods
        methodNames = methodNames.filter(isValidRPCName);

        // Use newer methods if available
        service.methods = methodNames.map((name) => {
            const existingMethod = existing.methods.find(method => method.name === name);
            const incomingMethod = methods.find(method => method.name === name);

            if(existing.version >= service.version){
                return existingMethod || incomingMethod;
            } else {
                return incomingMethod || existingMethod;
            }
        });

        // Use max of both versions
        if(existing.version > service.version){
            service.version = existing.version;
        }
    }


    const query = {$set: service};
    try {
        await storage.updateOne({name}, query, {upsert: true});
        ServiceEvents.emit(ServiceEvents.UPDATE, name);
        IoTScapeServices.updateOrCreateServiceInfo(name, parsed, id, remote);
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
    IoTScape._createService(message, remote);
});

IoTScapeServices.start(server);

/* eslint no-console: off */
if (process.env.IOTSCAPE_PORT) {
    console.log('IOTSCAPE_PORT is ' + process.env.IOTSCAPE_PORT);
    
    // Clear old devices
    IoTScape._getDatabase().deleteMany({type: 'DeviceService'});

    server.bind(process.env.IOTSCAPE_PORT || 1975);
}

IoTScape.isSupported = function () {
    if (!process.env.IOTSCAPE_PORT) {
        console.log('IOTSCAPE_PORT is not set (to 1975), IoTScape is disabled');
    }
    return !!process.env.IOTSCAPE_PORT;
};

module.exports = IoTScape;

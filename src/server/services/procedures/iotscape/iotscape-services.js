const logger = require('../utils/logger')('iotscape-services');
const ciphers = require('../roboscape/ciphers');

/**
 * Stores information about registered services, with a list of IDs and their respective hosts
 */
const IoTScapeServices = {};

IoTScapeServices._services = {};
IoTScapeServices._serviceDefinitions = {};
IoTScapeServices._encryptionStates = {};

/**
 * Creates or updates the connection information for a remote service
 * @param {String} name 
 * @param {String} id 
 * @param {RemoteInfo} rinfo 
 */
IoTScapeServices.updateOrCreateServiceInfo = function (name, definition, id, rinfo) {
    let service = IoTScapeServices._services[name];
    IoTScapeServices._serviceDefinitions[name] = definition;
    
    logger.log('Discovering ' + name + ':' + id + ' at ' + rinfo.address + ':' + rinfo.port);
    
    if (!service) {
        // Service not added yet
        service = IoTScapeServices._services[name] = {};
    }

    service[id] = rinfo;
};

/**
 * Remove a device from a service
 * @param {String} service Name of service
 * @param {String} id ID of device to remove
 */
IoTScapeServices.removeDevice = function(service, id) {
    if(!IoTScapeServices.deviceExists(service, id)){
        return;
    }

    delete IoTScapeServices._services[service][id];

    if(Object.keys(IoTScapeServices._encryptionStates).includes(service)){
        delete IoTScapeServices._encryptionStates[service][id];
    }

    if(IoTScapeServices._listeningClients[service] !== undefined && IoTScapeServices._listeningClients[service][id] !== undefined){
        delete IoTScapeServices._listeningClients[service][id];
    }
};

/**
 * List IDs of devices associated for a service
 * @param {String} service Name of service to get device IDs for
 */
IoTScapeServices.getDevices = function (service) {
    const serviceDict = IoTScapeServices._services[service];
    return Object.keys(serviceDict || []);
};

/**
 * List services
 */
IoTScapeServices.getServices = function () {
    return Object.keys(IoTScapeServices._services);
};

/**
 * List events associated with a service
 * @param {string} service Name of service
 */
IoTScapeServices.getMessageTypes = function(service) {
    if(!IoTScapeServices.serviceExists(service)){
        return {};
    }
    
    // Parse events into NetsBlox-friendlier format
    let eventsInfo = IoTScapeServices._serviceDefinitions[service].events || {};
    eventsInfo = Object.keys(eventsInfo).map(event => [event, ['id', ...eventsInfo[event].params]]);
    return eventsInfo;
};


/**
 * List methods associated with a service
 * @param {string} service Name of service
 */
IoTScapeServices.getMethods = function(service) {
    if(!IoTScapeServices.serviceExists(service)){
        return {};
    }
    
    // Parse methods into NetsBlox-friendlier format
    let methodsInfo = IoTScapeServices._serviceDefinitions[service].methods;
    methodsInfo = Object.keys(methodsInfo).map(method => [method, methodsInfo[method].params.map(param => param.name)]);
    return methodsInfo;
};

/**
 * Determine if a device with a given ID exists
 * @param {String} service Name of service
 * @param {String} id ID of device
 * @returns {Boolean} If device exists
 */
IoTScapeServices.deviceExists = function(service, id){
    return IoTScapeServices.getDevices(service).includes(id);
};

/**
 * Determine if a service exists
 * @param {String} service Name of service
 * @returns {Boolean} If service exists
 */
IoTScapeServices.serviceExists = function(service){
    return IoTScapeServices.getServices().includes(service);
};

/**
 * Methods handled locally or sent by server instead of user
 */
IoTScapeServices._specialMethods = {
    'heartbeat': {
        returns: {
            type:['boolean']
        }
    },
    'setKey': {
        params: [{
            'name': 'key',
            'documentation': 'Key to set',
            'type': 'number',
            'optional': false
        }],
        returns: {
            type: ['void']
        }
    },
    'setCipher': {
        params: [{
            'name': 'cipher',
            'documentation': 'Cipher to use',
            'type': 'string',
            'optional': false
        }],
        returns: {
            type:['void']
        }
    },
    '_requestedKey': {
        returns: {
            type: ['void']
        }
    }
};

/**
 * Determine if a service has a given function
 * @param {String} service Name of service
 * @param {String} func Name of function
 * @returns {Boolean} If function exists
 */
IoTScapeServices.functionExists = function(service, func){
    if(!IoTScapeServices.serviceExists(service)){
        return false;
    }
    
    return Object.keys(IoTScapeServices._specialMethods).includes(func) || IoTScapeServices.getFunctionInfo(service, func) !== undefined;
};

/**
 * Get the remote host of a IoTScape device
 * @param {String} service Name of service
 * @param {String} id ID of device
 */
IoTScapeServices.getInfo = function(service, id){
    return IoTScapeServices._services[service][id];
};

/**
 * Get definition information for a given function
 * @param {String} service Name of service
 * @param {String} func Name of function
 */
IoTScapeServices.getFunctionInfo = function(service, func) {
    
    if(Object.keys(IoTScapeServices._specialMethods).includes(func)){
        return IoTScapeServices._specialMethods[func];
    }

    return IoTScapeServices._serviceDefinitions[service].methods[func];
};

IoTScapeServices._lastRequestID = 0;

/**
 * Get ID for a new request
 */
IoTScapeServices._generateRequestID = function(){
    return (IoTScapeServices._lastRequestID++).toString() + Date.now();
};

IoTScapeServices._awaitingRequests = {};
IoTScapeServices._listeningClients = {};

/**
 * Add a client to get event updates from a device
 * @param {String} service Name of service
 * @param {*} client Client to add to listeners
 * @param {String} id ID of device
 */
IoTScapeServices.listen = function(service, client, id){
    id = id.toString();

    // Validate name and ID
    if(!IoTScapeServices.deviceExists(service, id)){
        return false;
    }
    
    if(!Object.keys(IoTScapeServices._listeningClients).includes(service)){
        IoTScapeServices._listeningClients[service] = {};
    }

    if(!Object.keys(IoTScapeServices._listeningClients[service]).includes(id)){
        IoTScapeServices._listeningClients[service][id] = [];
    }

    if(!IoTScapeServices._listeningClients[service][id].includes(client)){
        IoTScapeServices._listeningClients[service][id].push(client);
    }
};

/**
 * Make a call to a IoTScape function
 * @param {String} service Name of service
 * @param {String} func RPC on device to call
 * @param {String} id ID of device
 * @param  {...any} args 
 */
IoTScapeServices.call = async function (service, func, id, ...args) {
    id = id.toString();

    // Validate name, ID, and function
    if(!IoTScapeServices.deviceExists(service, id) || !IoTScapeServices.functionExists(service, func)){
        logger.log(`Unknown function ${func} or unknown device ${service}:${id}`);
        return false;
    }

    const reqid = IoTScapeServices._generateRequestID();

    // Don't send out serverside commands
    if(func !== 'setKey' && func !== 'setCipher') {
        // Create and send request
        let request = {
            id: reqid,
            service: service,
            device: id,
            function: func, 
            params: [...args],
        };
        
        const rinfo = IoTScapeServices.getInfo(service, id);
        IoTScapeServices.socket.send(JSON.stringify(request), rinfo.port, rinfo.address);
    }

    // Relay as message to listening clients
    if(func !== 'heartbeat'){
        IoTScapeServices.sendMessageToListeningClients(service, id, 'device command', {command: IoTScapeServices.deviceEncrypt(service, id, [func, ...args].join(' '))});
    }

    // Handle setKey/Cipher after relaying message to use old encryption
    if(func === 'setKey'){
        IoTScapeServices.updateEncryptionState(service, id, args, null);
    } else if(func === 'setCipher'){
        IoTScapeServices.updateEncryptionState(service, id, null, args[0]);
    }

    // Determine response type
    const methodInfo = IoTScapeServices.getFunctionInfo(service, func);
    const responseType = methodInfo.returns.type;

    // No response required
    if(responseType.length < 1 || responseType[0] == 'void' || responseType[0].startsWith('event')){
        return true;
    }

    // Expects a value response
    return _createRequestWithTimeout(reqid, service, func);
};

/**
 * Setup a Promise for the result of a request with a timeout
 * @param {String} reqid Requst ID
 * @param {String} service Service name
 * @param {String} func Function name
 * @param {Number} timeout Timeout in ms
 * @returns 
 */
const _createRequestWithTimeout = function(reqid, service, func, timeout = 3000) {
    return Promise.race([
        new Promise((resolve) => {
            IoTScapeServices._awaitingRequests[reqid] = {
                service: service,
                function: func,
                resolve
            };
        }), 
        new Promise((_, reject) => {
            // Time out eventually
            setTimeout(() => {
                delete IoTScapeServices._awaitingRequests[reqid];
                reject();
            }, timeout);
        })
    ]).then((result) => result).catch(() => {
        throw new Error('Response timed out.');
    });
};

/**
 * Get a device's encryption settings (or defaults if not set)
 * @param {String} service Service device is contained in
 * @param {String} id ID of device to get encryption settings for
 */
IoTScapeServices.getEncryptionState = function(service, id){
    if(!IoTScapeServices.deviceExists(service, id)){
        throw new Error('Device not found');
    }

    if(!Object.keys(IoTScapeServices._encryptionStates).includes(service)){
        IoTScapeServices._encryptionStates[service] = {};
    }

    if(!Object.keys(IoTScapeServices._encryptionStates[service]).includes(id)){
        // Create entry with default
        IoTScapeServices._encryptionStates[service][id] = {
            key: [0],
            cipher: 'plain'
        };
    }

    return IoTScapeServices._encryptionStates[service][id];
};

/**
 * Encrypt a string with a device's encryption settings
 * @param {String} service Service device is contained in
 * @param {String} id ID of device to use encryption settings for
 * @param {String} plaintext Plaintext to encrypt
 * @returns Plaintext encrypted with device's encryption settings
 */
IoTScapeServices.deviceEncrypt = function(service, id, plaintext){
    let encryptionState = IoTScapeServices.getEncryptionState(service, id);
    return ciphers[encryptionState.cipher].encrypt(plaintext, encryptionState.key);
};

/**
 * Encrypt a string with a device's encryption settings
 * @param {String} service Service device is contained in
 * @param {String} id ID of device to use encryption settings for
 * @param {String} ciphertext Ciphertext to decrypt
 * @returns Ciphertext decrypted with device's encryption settings
 */
IoTScapeServices.deviceDecrypt = function(service, id, ciphertext){
    let encryptionState = IoTScapeServices.getEncryptionState(service, id);
    return ciphers[encryptionState.cipher].decrypt(ciphertext, encryptionState.key);
};

/**
 * Updates encryption settings for a device
 * @param {String} service Service device is contained in
 * @param {String} id ID of device to update encryption settings for
 * @param {String=} key Key to set
 * @param {String=} cipher Cipher to set
 */
IoTScapeServices.updateEncryptionState = function(service, id, key = null, cipher = null) {
    if(!IoTScapeServices.deviceExists(service, id)){
        throw new Error('Device not found');
    }

    if(!Object.keys(IoTScapeServices._encryptionStates).includes(service)){
        IoTScapeServices._encryptionStates[service] = {};
    }

    if(!Object.keys(IoTScapeServices._encryptionStates[service]).includes(id)){
        // Create entry with default
        IoTScapeServices._encryptionStates[service][id] = {
            key: [0],
            cipher: 'plain'
        };
    }

    // Update key if requested
    if(key != null){
        // Set default cipher
        if(IoTScapeServices._encryptionStates[service][id].cipher === 'plain' && cipher == null){
            cipher = 'caesar';
        }

        key = key.map(c => parseInt(c));

        if(key.includes(NaN)){
            throw new Error('Invalid key');
        }

        IoTScapeServices._encryptionStates[service][id].key = key;
    }

    // Update cipher if requested
    cipher = (cipher || '').toLowerCase();
    if(Object.keys(ciphers).includes(cipher)){
        IoTScapeServices._encryptionStates[service][id].cipher = cipher;
    } else if(cipher != ''){
        // Prevent attempts to use ciphers with no implementation
        throw new Error('Invalid cipher');
    }
};

IoTScapeServices._specialMessageTypes = {
    '_reset': (parsed) => {
    // Reset encryption on device
        logger.log(`Resetting ${parsed.service}:${parsed.id}`);
        if(Object.keys(IoTScapeServices._encryptionStates).includes(parsed.service)){
            delete IoTScapeServices._encryptionStates[parsed.service][parsed.id];
        }
    }, 
    '_requestKey': (parsed) => {
        logger.log(`Generating HW key for ${parsed.service}:${parsed.id}`);
        // Generate hardware key
        let key = [];

        for (let i = 0; i < 4; i++) {
            key.push(Math.floor(Math.random() * 16));
        }

        IoTScapeServices.updateEncryptionState(parsed.service, parsed.id, key, 'caesar');

        // Tell device what the new key is, so it can display it
        IoTScapeServices.call(parsed.service, '_requestedKey', parsed.id, ...key);
    }, 
    '_link': (parsed) => {
        const targetService = parsed.event.args.service;
        const targetID = parsed.event.args.id;

        if(!IoTScapeServices.deviceExists(targetService, targetID)){
            logger.log(`Requested invalid link of ${parsed.service}:${parsed.id} to ${targetService}:${targetID}`);
            return;
        }
        
        logger.log(`Linking ${parsed.service}:${parsed.id} to ${targetService}:${targetID}`);
    }
};

const _handleMessage = function (message, remote) {
    let parsed = null;

    try {
        parsed = JSON.parse(message);
    } catch(err){
        logger.log('Error parsing IoTScape message: ' + err);
        return;
    }

    if(parsed == null){
        logger.log('Invalid IoTScape message');
        return;
    }

    // Ignore other messages
    if(parsed.request){
        const requestID = parsed.request;
        
        if(Object.keys(IoTScapeServices._awaitingRequests).includes(requestID.toString())){
            if(parsed.response){
                // Return multiple results as a list, single result as a value
                const methodInfo = IoTScapeServices.getFunctionInfo(IoTScapeServices._awaitingRequests[requestID].service, IoTScapeServices._awaitingRequests[requestID].function);
                const responseType = methodInfo.returns.type;

                try {
                    if(responseType.length > 1) {
                        IoTScapeServices._awaitingRequests[requestID].resolve(parsed.response);
                    } else {
                        IoTScapeServices._awaitingRequests[requestID].resolve(...parsed.response);
                    }
                } catch (error) {
                    logger.log('IoTScape response invalid: ' + error);
                }

                delete IoTScapeServices._awaitingRequests[requestID];
            }
        }
    }

    if(parsed.event && IoTScapeServices.deviceExists(parsed.service, parsed.id)){
        // Handle special message types, but only if they come from the device
        if(Object.keys(IoTScapeServices._specialMessageTypes).includes(parsed.event.type) && IoTScapeServices._services[parsed.service][parsed.id].address == remote.address && IoTScapeServices._services[parsed.service][parsed.id].port == remote.port){
            IoTScapeServices._specialMessageTypes[parsed.event.type](parsed);
        } else {
            IoTScapeServices.sendMessageToListeningClients(parsed.service, parsed.id.toString(), parsed.event.type, {...parsed.event.args});
        }
    }
};

IoTScapeServices.sendMessageToListeningClients = function(service, id, type, content){
    // Find listening clients 
    const clientsByID = IoTScapeServices._listeningClients[service] || {};
    const clients = clientsByID[id] || [];

    if(IoTScapeServices.getEncryptionState(service, id).cipher == 'plain'){
        // Send basic mode responses
        clients.forEach((client) => {
            client.sendMessage(type, {id, ...content});
        });
    } 
    
    if(type !== 'device command') {
        clients.forEach((client) => {
            client.sendMessage('device message', {id, message: IoTScapeServices.deviceEncrypt(service, id, [type, ...Object.values(content)].join(' '))});
        });
    }
};

/**
 * Send heartbeat requests to all devices
 */
const _requestHeartbeats = async () => {
    for (const service of IoTScapeServices.getServices()) {
        IoTScapeServices.getDevices(service).forEach(async (device) => {
            logger.log(`heartbeat ${service}:${device}`);
            
            try {
                // Send heartbeat request, will timeout if device does not respond
                await IoTScapeServices.call(service, 'heartbeat', device);
            } catch(e) {
                // Remove device if it didn't respond
                logger.log(`${service}:${device} did not respond to heartbeat, removing from active devices`);
                IoTScapeServices.removeDevice(service, device);
            }
        });
    }
};

IoTScapeServices.start = function(socket){
    IoTScapeServices.socket = socket;

    // Handle incoming responses
    IoTScapeServices.socket.on('message', _handleMessage);

    // Request heartbeats on interval
    setInterval(_requestHeartbeats, 60 * 1000);
};

module.exports = IoTScapeServices;
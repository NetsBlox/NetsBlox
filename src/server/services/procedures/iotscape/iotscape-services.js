const logger = require('../utils/logger')('iotscape-services');

/**
 * Stores information about registered services, with a list of IDs and their respective hosts
 */
const IoTScapeServices = {};

IoTScapeServices._services = {};
IoTScapeServices._serviceDefinitions = {};

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
        return [];
    }
    
    // Parse events into NetsBlox-friendlier format
    let eventsInfo = IoTScapeServices._serviceDefinitions[service].events;
    eventsInfo = Object.keys(eventsInfo).map(event => [event, eventsInfo[event].params]);
    return eventsInfo;
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
 * Determine if a service has a given function
 * @param {String} service Name of service
 * @param {String} func Name of function
 * @returns {Boolean} If function exists
 */
IoTScapeServices.functionExists = function(service, func){
    if(!IoTScapeServices.serviceExists(service)){
        return false;
    }
    
    return func === 'heartbeat' || IoTScapeServices.getFunctionInfo(service, func) !== undefined;
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
    if(func === 'heartbeat'){
        return {returns: {type:['boolean']}};
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
        return false;
    }

    // Create and send request
    const reqid = IoTScapeServices._generateRequestID();
    let request = {
        id: reqid,
        service: service,
        device: id,
        function: func, 
        params: [...args],
    };
    
    const rinfo = IoTScapeServices.getInfo(service, id);
    IoTScapeServices.socket.send(JSON.stringify(request), rinfo.port, rinfo.address);

    // Determine response type
    const methodInfo = IoTScapeServices.getFunctionInfo(service, func);
    const responseType = methodInfo.returns.type;

    // No response required
    if(responseType.length < 1 || responseType[0] == 'void'){
        return;
    }

    // Event response type
    if(responseType[0].startsWith('event')){
        return;
    }

    // Expects a value response
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
            }, 3000);
        })
    ]).then((result) => result).catch(() => {
        throw new Error('Response timed out.');
    });
};

IoTScapeServices.start = function(socket){
    IoTScapeServices.socket = socket;

    // Handle incoming responses
    IoTScapeServices.socket.on('message', function (message) {
        let parsed;

        try {
            parsed = JSON.parse(message);
        } catch(err){
            logger.log('Error parsing IoTScape message: ' + err);
            return;
        }

        // Ignore other messages
        if(!parsed.request){
            return;
        }

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

        if(parsed.event){
            // Find listening clients 
            const clientsByID = IoTScapeServices._listeningClients[parsed.service] || {};
            const clients = clientsByID[parsed.id.toString()] || [];
            
            // Send responses
            clients.forEach((client) => {
                client.sendMessage(parsed.event.type, parsed.event.args);
            });
        }
    });


    // Request heartbeats on interval
    setInterval(async () => {
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
    }, 60 * 1000);
};

module.exports = IoTScapeServices;
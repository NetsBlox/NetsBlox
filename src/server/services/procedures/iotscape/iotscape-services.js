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
 * @param {String} name Name of service
 * @param {String} id ID of device to remove
 */
IoTScapeServices.removeDevice = function(name, id) {
    if(!IoTScapeServices.deviceExists(name, id)){
        return;
    }

    delete IoTScapeServices._services[name][id];

    if(IoTScapeServices._listeningClients[name] !== undefined && IoTScapeServices._listeningClients[name][id] !== undefined){
        delete IoTScapeServices._listeningClients[name][id];
    }
    // TODO: fully remove services with zero devices
};

/**
 * List IDs of devices associated for a service
 * @param {String} name Name of service to get device IDs for
 */
IoTScapeServices.getDevices = function (name) {
    if(Object.keys(IoTScapeServices._services).includes(name)){
        return Object.keys(IoTScapeServices._services[name]);
    }

    return false;
};

/**
 * List services
 */
IoTScapeServices.getServices = function () {
    return Object.keys(IoTScapeServices._services);
};

/**
 * Determine if a device with a given ID exists
 * @param {String} name Name of service
 * @param {String} id ID of device
 * @returns {Boolean} If device exists
 */
IoTScapeServices.deviceExists = function(name, id){
    let devices = IoTScapeServices.getDevices(name);
    return devices && devices.includes(id);
};


/**
 * Determine if a service has a given function
 * @param {String} name Name of service
 * @param {String} func Name of function
 * @returns {Boolean} If function exists
 */
IoTScapeServices.functionExists = function(name, func){
    if(!IoTScapeServices.getServices().includes(name)){
        return false;
    }
    
    return func === 'heartbeat' || IoTScapeServices.getFunctionInfo(name, func) !== undefined;
};

/**
 * Get the remote host of a IoTScape device
 * @param {String} name Name of service
 * @param {String} id ID of device
 */
IoTScapeServices.getInfo = function(name, id){
    return IoTScapeServices._services[name][id];
};

/**
 * Get definition information for a given function
 * @param {String} name Name of service
 * @param {String} func Name of function
 */
IoTScapeServices.getFunctionInfo = function(name, func) {
    if(func === 'heartbeat'){
        return {returns: {type:['boolean']}};
    }

    return IoTScapeServices._serviceDefinitions[name].methods[func];
};

IoTScapeServices._lastRequestID = 0;

/**
 * Get ID for a new request
 */
IoTScapeServices._generateRequestID = function(){
    return IoTScapeServices._lastRequestID++;
};

IoTScapeServices._awaitingRequests = {};
IoTScapeServices._listeningClients = {};

/**
 * Add a client to get event updates from a device
 * @param {String} name Name of service
 * @param {String} id ID of device
 * @param {*} client Client to add to listeners
 */
IoTScapeServices.listen = function(name, client, id){
    id = id.toString();

    // Validate name and ID
    if(!IoTScapeServices.deviceExists(name, id)){
        return false;
    }
    
    if(!Object.keys(IoTScapeServices._listeningClients).includes(name)){
        IoTScapeServices._listeningClients[name] = {};
    }

    if(!Object.keys(IoTScapeServices._listeningClients[name]).includes(id)){
        IoTScapeServices._listeningClients[name][id] = [];
    }

    if(!IoTScapeServices._listeningClients[name][id].includes(client)){
        IoTScapeServices._listeningClients[name][id].push(client);
    }
};

/**
 * Make a call to a IoTScape function
 * @param {String} name Name of service
 * @param {String} id ID of device
 * @param  {...any} args 
 */
IoTScapeServices.call = async function (name, func, id, ...args) {
    id = id.toString();

    // Validate name, ID, and function
    if(!IoTScapeServices.deviceExists(name, id) || !IoTScapeServices.functionExists(name, func)){
        return false;
    }

    // Create and send request
    const reqid = IoTScapeServices._generateRequestID();
    let request = {
        id: reqid,
        function: func, 
        params: [...args]
    };
    
    let rinfo = IoTScapeServices.getInfo(name, id);
    IoTScapeServices.socket.send(JSON.stringify(request), rinfo.port, rinfo.address);

    // Determine response type
    let methodInfo = IoTScapeServices.getFunctionInfo(name, func);
    let responseType = methodInfo.returns.type;

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
            IoTScapeServices._awaitingRequests[reqid] = resolve;
        }), 
        new Promise((_, reject) => {
            // Time out eventually
            setTimeout(() => {
                delete IoTScapeServices._awaitingRequests[reqid];
                reject();
            }, 3000);
        })
    ]).then((result) => result).catch(() => false);
};

IoTScapeServices.start = function(socket){
    IoTScapeServices.socket = socket;

    // Handle incoming responses
    IoTScapeServices.socket.on('message', function (message) {
        const parsed = JSON.parse(message);

        // Ignore other messages
        if(!parsed.request){
            return;
        }

        const requestID = parsed.request;
        
        if(Object.keys(IoTScapeServices._awaitingRequests).includes(requestID.toString())){
            if(parsed.response){
                IoTScapeServices._awaitingRequests[requestID](...parsed.response);
                delete IoTScapeServices._awaitingRequests[requestID];
            }
        }

        if(parsed.event){
            // Find listening clients 
            let clientsByID = IoTScapeServices._listeningClients[parsed.service];

            if(clientsByID){
                let clients = clientsByID[parsed.id.toString()];
                
                // Send responses
                if(clients){
                    clients.forEach((client) => {
                        client.sendMessage(parsed.event.type, parsed.event.args);
                    });
                }
            }
        }
    });


    // Request heartbeats on interval
    setInterval(async () => {
        for (const service of IoTScapeServices.getServices()) {
            IoTScapeServices.getDevices(service).forEach(async (device) => {
                logger.log(`heartbeat ${service}:${device}`);
                let alive = await IoTScapeServices.call(service, 'heartbeat', device);
                
                // Remove device if it didn't respond
                if(!alive) {
                    logger.log(`${service}:${device} did not respond to heartbeat, removing from active devices`);
                    IoTScapeServices.removeDevice(service, device);
                }
            });
        }
    }, 60 * 1000);
};

module.exports = IoTScapeServices;
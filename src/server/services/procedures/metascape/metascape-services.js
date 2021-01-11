const logger = require('../utils/logger')('metascape-services');

const dgram = require('dgram'),
    socket = dgram.createSocket('udp4');

socket.bind();

/**
 * Stores information about registered services, with a list of IDs and their respective hosts
 */
const MetaScapeServices = {};

MetaScapeServices._services = {};
MetaScapeServices._serviceDefinitions = {};

/**
 * Creates or updates the connection information for a remote service
 * @param {String} name 
 * @param {String} id 
 * @param {RemoteInfo} rinfo 
 */
MetaScapeServices.updateOrCreateServiceInfo = function (name, definition, id, rinfo) {
    let service = MetaScapeServices._services[name];
    MetaScapeServices._serviceDefinitions[name] = definition;
    
    logger.log('Discovering ' + name + ':' + id + ' at ' + rinfo.address + ':' + rinfo.port);
    
    if (!service) {
        // Service not added yet
        service = MetaScapeServices._services[name] = {};
    }

    service[id] = rinfo;
};

/**
 * Remove a device from a service
 * @param {String} name Name of service
 * @param {String} id ID of device to remove
 */
MetaScapeServices.removeDevice = function(name, id) {
    if(!MetaScapeServices.deviceExists(name, id)){
        return;
    }

    delete MetaScapeServices._services[name][id];

    if(MetaScapeServices._listeningClients[name] !== undefined && MetaScapeServices._listeningClients[name][id] !== undefined){
        delete MetaScapeServices._listeningClients[name][id];
    }
    // TODO: fully remove services with zero devices
};

/**
 * List IDs of devices associated for a service
 * @param {String} name Name of service to get device IDs for
 */
MetaScapeServices.getDevices = function (name) {
    if(Object.keys(MetaScapeServices._services).includes(name)){
        return Object.keys(MetaScapeServices._services[name]);
    }

    return false;
};

/**
 * List services
 */
MetaScapeServices.getServices = function () {
    return Object.keys(MetaScapeServices._services);
};

/**
 * Determine if a device with a given ID exists
 * @param {String} name Name of service
 * @param {String} id ID of device
 * @returns {Boolean} If device exists
 */
MetaScapeServices.deviceExists = function(name, id){
    let devices = MetaScapeServices.getDevices(name);
    return devices && devices.includes(id);
};


/**
 * Determine if a service has a given function
 * @param {String} name Name of service
 * @param {String} func Name of function
 * @returns {Boolean} If function exists
 */
MetaScapeServices.functionExists = function(name, func){
    if(!MetaScapeServices.getServices().includes(name)){
        return false;
    }
    
    return func === 'heartbeat' || MetaScapeServices.getFunctionInfo(name, func) !== undefined;
};

/**
 * Get the remote host of a MetaScape device
 * @param {String} name Name of service
 * @param {String} id ID of device
 */
MetaScapeServices.getInfo = function(name, id){
    return MetaScapeServices._services[name][id];
};

/**
 * Get definition information for a given function
 * @param {String} name Name of service
 * @param {String} func Name of function
 */
MetaScapeServices.getFunctionInfo = function(name, func) {
    if(func === 'heartbeat'){
        return {returns: {type:['boolean']}};
    }

    return MetaScapeServices._serviceDefinitions[name].methods[func];
};

MetaScapeServices._lastRequestID = 0;

/**
 * Get ID for a new request
 */
MetaScapeServices._generateRequestID = function(){
    return MetaScapeServices._lastRequestID++;
};

MetaScapeServices._awaitingRequests = {};
MetaScapeServices._listeningClients = {};

/**
 * Add a client to get event updates from a device
 * @param {String} name Name of service
 * @param {String} id ID of device
 * @param {*} client Client to add to listeners
 */
MetaScapeServices.listen = function(name, client, id){
    id = id.toString();

    // Validate name and ID
    if(!MetaScapeServices.deviceExists(name, id)){
        return false;
    }
    
    if(!Object.keys(MetaScapeServices._listeningClients).includes(name)){
        MetaScapeServices._listeningClients[name] = {};
    }

    if(!Object.keys(MetaScapeServices._listeningClients[name]).includes(id)){
        MetaScapeServices._listeningClients[name][id] = [];
    }

    if(!MetaScapeServices._listeningClients[name][id].includes(client)){
        MetaScapeServices._listeningClients[name][id].push(client);
    }
};

/**
 * Make a call to a MetaScape function
 * @param {String} name Name of service
 * @param {String} id ID of device
 * @param  {...any} args 
 */
MetaScapeServices.call = async function (name, func, id, ...args) {
    id = id.toString();

    // Validate name, ID, and function
    if(!MetaScapeServices.deviceExists(name, id) || !MetaScapeServices.functionExists(name, func)){
        return false;
    }

    // Create and send request
    const reqid = MetaScapeServices._generateRequestID();
    let request = {
        id: reqid,
        function: func, 
        params: [...args]
    };
    
    let rinfo = MetaScapeServices.getInfo(name, id);
    socket.send(JSON.stringify(request), rinfo.port, rinfo.address);

    // Determine response type
    let methodInfo = MetaScapeServices.getFunctionInfo(name, func);
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
            MetaScapeServices._awaitingRequests[reqid] = resolve;
        }), 
        new Promise((_, reject) => {
            // Time out eventually
            setTimeout(() => {
                delete MetaScapeServices._awaitingRequests[reqid];
                reject();
            }, 3000);
        })
    ]).then((result) => result).catch(() => false);
};

// Handle incoming responses
socket.on('message', function (message) {
    const parsed = JSON.parse(message);
    const requestID = parsed.request;
    
    if(Object.keys(MetaScapeServices._awaitingRequests).includes(requestID.toString())){
        if(parsed.response){
            MetaScapeServices._awaitingRequests[requestID](...parsed.response);
            delete MetaScapeServices._awaitingRequests[requestID];
        }
    }

    if(parsed.event){
        // Find listening clients 
        let clientsByID = MetaScapeServices._listeningClients[parsed.service];

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
    for (const service of MetaScapeServices.getServices()) {
        MetaScapeServices.getDevices(service).forEach(async (device) => {
            logger.log(`heartbeat ${service}:${device}`);
            let alive = await MetaScapeServices.call(service, 'heartbeat', device);
            
            // Remove device if it didn't respond
            if(!alive) {
                logger.log(`${service}:${device} did not respond to heartbeat, removing from active devices`);
                MetaScapeServices.removeDevice(service, device);
            }
        });
    }
}, 60 * 1000);

module.exports = MetaScapeServices;
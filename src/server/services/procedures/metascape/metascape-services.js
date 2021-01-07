const logger = require('../utils/logger')('metascape-services');

const dgram = require('dgram'),
    socket = dgram.createSocket('udp4');

socket.bind();

/**
 * Stores information about registered services, with a list of IDs and their respective hosts
 */
const MetaScapeServices = {};

MetaScapeServices._services = {};

/**
 * Creates or updates the connection information for a remote service
 * @param {String} name 
 * @param {String} id 
 * @param {RemoteInfo} rinfo 
 */
MetaScapeServices.updateOrCreateServiceInfo = function (name, id, rinfo) {
    let service = MetaScapeServices._services[name];
    
    logger.log('Discovering ' + name + ':' + id + ' at ' + rinfo.address + ':' + rinfo.port);
    
    if (!service) {
        // Service not added yet
        service = MetaScapeServices._services[name] = {};
    }

    service[id] = rinfo;
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
 * Get the remote host of a MetaScape device
 * @param {String} name Name of service
 * @param {String} id ID of device
 */
MetaScapeServices.getInfo = function(name, id){
    return MetaScapeServices._services[name][id];
};

MetaScapeServices._lastRequestID = 0;

/**
 * Get ID for a new request
 */
MetaScapeServices._generateRequestID = function(){
    return MetaScapeServices._lastRequestID++;
};

MetaScapeServices._awaitingRequests = {};

/**
 * Make a call to a MetaScape function
 * @param {String} name Name of service
 * @param {String} id ID of device
 * @param  {...any} args 
 */
MetaScapeServices.call = async function (name, func, id, ...args) {
    // Validate name and ID
    if(!MetaScapeServices.deviceExists(name, id)){
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
    const id = parsed.id;
    
    if(Object.keys(MetaScapeServices._awaitingRequests).includes(id.toString())){
        if(parsed.response){
            MetaScapeServices._awaitingRequests[id](...parsed.response);
            delete MetaScapeServices._awaitingRequests[id];
        }
    } 
});

module.exports = MetaScapeServices;
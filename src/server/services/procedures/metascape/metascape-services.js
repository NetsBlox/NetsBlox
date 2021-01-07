const logger = require('../utils/logger')('metascape-services');

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

module.exports = MetaScapeServices;
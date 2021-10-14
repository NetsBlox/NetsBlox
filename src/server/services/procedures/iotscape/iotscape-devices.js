const logger = require('../utils/logger')('iotscape-devices');
const ciphers = require('../roboscape/ciphers');

/**
 * Stores information about registered devices, with a list of IDs and their respective hosts
 */
const IoTScapeDevices = {};
IoTScapeDevices._services = {};
IoTScapeDevices._encryptionStates = {};

/**
 * Encrypt a string with a device's encryption settings
 * @param {String} service Service device is contained in
 * @param {String} id ID of device to use encryption settings for
 * @param {String} plaintext Plaintext to encrypt
 * @returns Plaintext encrypted with device's encryption settings
 */
IoTScapeDevices.deviceEncrypt = function(service, id, plaintext){
    let encryptionState = IoTScapeDevices.getEncryptionState(service, id);
    return ciphers[encryptionState.cipher].encrypt(plaintext, encryptionState.key);
};

/**
 * Encrypt a string with a device's encryption settings
 * @param {String} service Service device is contained in
 * @param {String} id ID of device to use encryption settings for
 * @param {String} ciphertext Ciphertext to decrypt
 * @returns Ciphertext decrypted with device's encryption settings
 */
IoTScapeDevices.deviceDecrypt = function(service, id, ciphertext){
    let encryptionState = IoTScapeDevices.getEncryptionState(service, id);
    return ciphers[encryptionState.cipher].decrypt(ciphertext, encryptionState.key);
};

/**
 * Get the remote host of a IoTScape device
 * @param {String} service Name of service
 * @param {String} id ID of device
 */
IoTScapeDevices.getInfo = function(service, id){
    return IoTScapeDevices._services[service][id];
};

/**
 * Get a device's encryption settings (or defaults if not set)
 * @param {String} service Service device is contained in
 * @param {String} id ID of device to get encryption settings for
 */
IoTScapeDevices.getEncryptionState = function(service, id){
    if(!IoTScapeDevices.deviceExists(service, id)){
        throw new Error('Device not found');
    }

    if(!Object.keys(IoTScapeDevices._encryptionStates).includes(service)){
        IoTScapeDevices._encryptionStates[service] = {};
    }

    if(!Object.keys(IoTScapeDevices._encryptionStates[service]).includes(id)){
        // Create entry with default
        IoTScapeDevices._encryptionStates[service][id] = {
            key: [0],
            cipher: 'plain'
        };
    }

    const state = IoTScapeDevices._encryptionStates[service][id];

    if(state.cipher == 'linked'){
        return IoTScapeDevices.getEncryptionState(state.key.service, state.key.id);
    }

    return state;
};


/**
 * Updates encryption settings for a device
 * @param {String} service Service device is contained in
 * @param {String} id ID of device to update encryption settings for
 * @param {String=} key Key to set
 * @param {String=} cipher Cipher to set
 */
IoTScapeDevices.updateEncryptionState = function(service, id, key = null, cipher = null) {
    if(!IoTScapeDevices.deviceExists(service, id)){
        throw new Error('Device not found');
    }

    if(!Object.keys(IoTScapeDevices._encryptionStates).includes(service)){
        IoTScapeDevices._encryptionStates[service] = {};
    }

    if(!Object.keys(IoTScapeDevices._encryptionStates[service]).includes(id)){
        // Create entry with default
        IoTScapeDevices._encryptionStates[service][id] = {
            key: [0],
            cipher: 'plain'
        };
    }

    // Update key if requested
    if(key != null){
        // Set default cipher
        if(IoTScapeDevices._encryptionStates[service][id].cipher === 'plain' && cipher == null){
            cipher = 'caesar';
        }

        // Setting linked status does not require key to be parsed
        if(cipher != 'linked'){
            key = key.map(c => parseInt(c));        

            if(key.includes(NaN)){
                throw new Error('Invalid key');
            }
        }

        IoTScapeDevices._encryptionStates[service][id].key = key;
    }

    // Update cipher if requested
    cipher = (cipher || '').toLowerCase();
    if(['linked', ...Object.keys(ciphers)].includes(cipher)){
        IoTScapeDevices._encryptionStates[service][id].cipher = cipher;
    } else if(cipher != ''){
        // Prevent attempts to use ciphers with no implementation
        throw new Error('Invalid cipher');
    }
};

/**
 * Remove a device from a service
 * @param {String} service Name of service
 * @param {String} id ID of device to remove
 */
IoTScapeDevices.removeDevice = function(service, id) {
    if(!IoTScapeDevices.deviceExists(service, id)){
        return;
    }

    delete IoTScapeDevices._services[service][id];

    if(Object.keys(IoTScapeDevices._encryptionStates).includes(service)){
        delete IoTScapeDevices._encryptionStates[service][id];
    }

    if(IoTScapeDevices._listeningClients[service] !== undefined && IoTScapeDevices._listeningClients[service][id] !== undefined){
        delete IoTScapeDevices._listeningClients[service][id];
    }
};

/**
 * List IDs of devices associated for a service
 * @param {String} service Name of service to get device IDs for
 */
IoTScapeDevices.getDevices = function (service) {
    const serviceDict = IoTScapeDevices._services[service];
    return Object.keys(serviceDict || []);
};

/**
 * Determine if a device with a given ID exists
 * @param {String} service Name of service
 * @param {String} id ID of device
 * @returns {Boolean} If device exists
 */
IoTScapeDevices.deviceExists = function(service, id){
    return IoTScapeDevices.getDevices(service).includes(id);
};

/**
 * Clear the encryption settings for a device
 * @param {String} service Name of service
 * @param {String} id ID of device
 */
IoTScapeDevices.clearEncryption = function(service, id){
    if(Object.keys(IoTScapeDevices._encryptionStates).includes(service)){
        delete IoTScapeDevices._encryptionStates[service][id];
    }
};

/**
 * Set targetService's device with targetId as its ID to use the encryption settings of a different device
 * @param {String} service Name of service
 * @param {String} id ID of device
 * @param {String} targetService 
 * @param {String} targetId 
 */
IoTScapeDevices.link = function(service, id, targetService, targetId){
    // Validate input
    if(service == targetService && id == targetId){
        throw new Error('Device cannot be linked to self');
    }

    // Prevent cycles and long chains by enforcing only one layer of linking
    if(IoTScapeDevices.getEncryptionState(service, id).cipher == 'linked'){
        throw new Error('Cannot link to other linked device');
    }

    IoTScapeDevices.updateEncryptionState(targetService, targetId, {service, id}, 'linked');
};

module.exports = IoTScapeDevices;
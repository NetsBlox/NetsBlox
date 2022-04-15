const Q = require('q');
const fs = require('fs');
const path = require('path');
const logoPath = path.join(__dirname, '..', '..', '..', '..', '..', 'netsblox_logo.png');
const buffer = fs.readFileSync(logoPath);
const utils = require('../utils');
const logger = require('../utils/logger')('dev');
const _ = require('lodash');
const devLogger = require('../utils/dev-logger');
const NetsBloxCloud = require('../../cloud-client');

const dev = {};
dev.isSupported = () => process.env.ENV !== 'production';

/**
 * A function responding with the provided argument.
 * @param{Any} argument
 */
dev.echo = function (argument) {
    return argument;
};

/**
 * Send a message from the services server to a specific address.
 * @category messages
 *
 * @param{String} address
 * @param{String} messageType
 * @param{Object} contents
 */
dev.sendMessage = function (address, messageType, contents) {
    return this.socket.sendMessageTo(address, messageType, contents);
};

/**
 * Send a message from the services server to a given role.
 * @category messages
 *
 * @param{String} role
 * @param{String} messageType
 * @param{Object} contents
 */
dev.sendMessageToRole = async function (role, messageType, contents) {
    const room = await NetsBloxCloud.getRoomState(this.caller.projectId);
    const roleEntry = Object.entries(room.roles).find(([id, roleData]) => roleData.name === role);
    if (!roleEntry) {
        throw new Error(`Could not find role: ${role}`);
    }
    const roleID = roleEntry[0];
    return this.socket.sendMessageToRole(roleID, messageType, contents);
};

/**
 * Broadcast a message from the services server to the current room.
 * @category messages
 *
 * @param{String} messageType
 * @param{Object} contents
 */
dev.sendMessageToRoom = function (messageType, contents) {
    return this.socket.sendMessageToRoom(messageType, contents);
};

/**
 * Broadcast a message from the services server to the current room.
 * @category messages
 *
 * @param{String} messageType
 * @param{Object} contents
 * @param{BoundedInteger} delay # of seconds to wait before sending
 */
dev.sendMessageToClient = function (messageType, contents, delay=0) {
    setTimeout(() => this.socket.sendMessage(messageType, contents), delay*1000);
};

/**
 * A function throwing an error.
 * @param{String} msg Error message
 */
dev.throw = function(msg) {
    throw new Error(msg);
};

/**
 * A function returning an image.
 */
dev.image = function() {
    return utils.sendImageBuffer(this.response, buffer);
};

/**
 * Echo if the input is within 10 and 20 (manual test for parameterized types)
 * @param{BoundedNumber<10,20>} input
 */
dev.echoIfWithin = function(input) {
    return input;
};

/**
 * Sleep for 3 seconds and detect if the RPC was aborted.
 */
dev.detectAbort = function() {
    const deferred = Q.defer();
    let aborted = false;

    this.request.on('close', () => {
        logger.log('aborted rpc call!');
        deferred.resolve('aborted!');
        aborted = true;
    });

    setTimeout(() => aborted || deferred.resolve('not aborted'), 3000);
    return deferred.promise;
};

/**
 * Return the caller info as detected by the server.
 */
dev.callerInfo = function() {
    return _.omit(this.caller, ['response', 'request', 'socket', 'apiKey']);
};

/**
 * Return the sum of the inputs
 *
 * @param{Array<Number>} numbers
 */
dev.sum = function(numbers) {
    return numbers.reduce((s, n) => s+n, 0);
};

/**
 * Call an argument with a duck typed options object
 *
 * @param{Object} options
 * @param{String} options.name
 * @param{Number} options.age
 * @param{Number=} options.height
 */
dev.echoOptionsExample = function(options) {
    return options;
};

/**
 * Fetch debug logs for debugging remotely.
 * @category logging
 */
dev.getLogs = function() {
    return devLogger.read();
};

/**
 * Fetch debug logs for debugging remotely.
 * @category logging
 */
dev.clearLogs = function() {
    return devLogger.clear();
};

module.exports = dev;

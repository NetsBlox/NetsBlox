const Q = require('q');
const fs = require('fs');
const path = require('path');
const logoPath = path.join(__dirname, '..', '..', '..', '..', '..', 'netsblox_logo.png');
const buffer = fs.readFileSync(logoPath);
const utils = require('../utils');
const logger = require('../utils/logger')('dev');
const _ = require('lodash');

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

module.exports = dev;

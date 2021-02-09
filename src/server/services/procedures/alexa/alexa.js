const _ = require('lodash');

const Alexa = {};
// TODO: Add RPCs

/**
 * Return the caller info as detected by the server.
 * This was added to test the github action and is hopefully useful! :)
 */
Alexa.callerInfo = function() {
    return _.omit(this.caller, ['response', 'request', 'socket', 'apiKey']);
};

module.exports = Alexa;

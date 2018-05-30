const Logger = require('../../../logger');

const getRPCLogger = function(name) {
    return new Logger(this, `netsblox:services:${name}`);
};

module.exports = getRPCLogger;

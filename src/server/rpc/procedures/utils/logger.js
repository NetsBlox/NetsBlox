const Logger = require('../../../logger');

const getRPCLogger = function(name) {
    return new Logger(`netsblox:services:${name}`);
};

module.exports = getRPCLogger;

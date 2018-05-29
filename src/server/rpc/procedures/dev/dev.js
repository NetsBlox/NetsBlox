const fs = require('fs');
const path = require('path');
const logoPath = path.join(__dirname, '..', '..', '..', '..', '..', 'netsblox_logo.png');
const buffer = fs.readFileSync(logoPath);
const utils = require('../utils');

const dev = {};
dev.isSupported = () => process.env.ENV !== 'production';

dev.echo = function (argument) {
    return argument;
};

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

module.exports = dev;

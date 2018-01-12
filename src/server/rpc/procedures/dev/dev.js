const fs = require('fs');
const path = require('path');
const logoPath = path.join(__dirname, '..', '..', '..', '..', '..', 'netsblox_logo.png');
const buffer = fs.readFileSync(logoPath);
const utils = require('../utils');

module.exports = {
    isSupported: () => process.env.ENV !== 'production',
    echo: function (argument){
        return argument;
    },
    image: function() {
        return utils.sendImageBuffer(this.response, buffer);
    }
};

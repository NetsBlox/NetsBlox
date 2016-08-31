'use strict';

var randomString = require('just.randomstring');
module.exports = {
    GHOST: {
        USER: '__ghosty__',
        EMAIL: 'brian.d.broll@vanderbilt.edu',
        PASSWORD: 'tmp' || randomString(20)
    },
    EVERYONE: 'everyone in room'
};

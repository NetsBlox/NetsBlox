// User endpoints adapted from the Snap! server api. These are used by the server
// to create the endpoints and by the client to discover the endpoint urls
'use strict';

const logger = require('../utils/logger')('roboscape:routes');

module.exports = [
    {
        Parameters: '',
        Method: 'get',
        URL: 'golab/hamidoo',
        middleware: [],
        Handler: function(req, res) {
            res.send('hola ');
        }
    },
];

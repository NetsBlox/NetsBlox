'use strict';
var Messages = require('../MessageTypes'),
    debug = require('debug'),
    trace = debug('NetsBlox:API:MessageTypeRoutes:trace');

module.exports = [
    { 
        Method: 'get', 
        URL: 'MessageTypes/index',
        Handler: function(req, res) {
            trace('Received request for MessageTypes index');
            return res.json(Object.keys(Messages));
        }
    },
    { 
        Method: 'get', 
        URL: 'MessageTypes/:name',
        Handler: function(req, res) {
            trace(`Received request for MessageType "${req.params.name}":\n` +
                JSON.stringify(Messages[req.params.name]));
            return res.json(Messages[req.params.name]);
        }
    }
];

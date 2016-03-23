// This will use the jservice.io API to retrieve trivia questions.
//
// This is a static rpc collection. That is, it does not maintain state and is 
// shared across groups
'use strict';

var debug = require('debug'),
    error = debug('NetsBlox:RPCManager:Trivia:error'),
    trace = debug('NetsBlox:RPCManager:Trivia:trace'),
    request = require('request');

var baseUrl = 'http://jservice.io/api';

module.exports = {

    // This is very important => Otherwise it will try to instantiate this
    isStateless: true,

    // These next two functions are the same from the stateful RPC's
    getPath: function() {
        return '/trivia';
    },

    getActions: function() {
        return ['random'];
    },

    random: function(req, res) {
        var url = baseUrl + '/random';

        trace('Requesting random trivia');

        // This method will not respond with anything... It will simply
        // trigger socket messages to the given client
        request(url, function(err, response, body) {
            if (err) {
                res.serverError(err);
            }
            res.sendStatus(200);

            // Trigger the ws messages
            var questions = [],
                socket = req.netsbloxSocket,  // Get the websocket for network messages
                msg;

            try {
                questions = JSON.parse(body);
            } catch (e) {
                error('Could not parse questions (returning empty array): ' + e);
            }
            trace('Sending random trivia to ' + socket.username);

            for (var i = questions.length; i--;) {
                msg = {
                    type: 'message',
                    dstId: socket.roleId,
                    msgType: 'Trivia',
                    content: {
                        question: questions[i].question,
                        difficulty: questions[i].value,
                        answer: questions[i].answer
                    }
                };
                socket.send(msg);
            }
        });
    }
};

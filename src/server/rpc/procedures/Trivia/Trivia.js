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

    random: function() {
        var url = baseUrl + '/random',
            response = this.response,
            socket = this.socket;

        trace('Requesting random trivia');

        // This method will not respond with anything... It will simply
        // trigger socket messages to the given client
        request(url, (err, res, body) => {
            if (err) {
                return response.status(500).send('ERROR: ' + err);
            }
            response.send('trivia message sent!');

            // Trigger the ws messages
            var questions = [],
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
        return null;
    }
};

/**
 * The Trivia Service provides access to trivia questions using the jservice API.
 * For more information, check out https://jservice.io.
 * @service
 */
'use strict';

var debug = require('debug'),
    error = debug('netsblox:rpc:trivia:error'),
    trace = debug('netsblox:rpc:trivia:trace'),
    request = require('request');

var baseUrl = 'http://jservice.io/api';

module.exports = {

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
                    dstId: socket.role,
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

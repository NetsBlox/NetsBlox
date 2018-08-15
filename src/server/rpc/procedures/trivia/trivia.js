/**
 * The Trivia Service provides access to trivia questions using the jservice API.
 * For more information, check out https://jservice.io.
 * @service
 */
'use strict';

const logger = require('../utils/logger')('trivia');
const request = require('request');
const baseUrl = 'http://jservice.io/api';

module.exports = {

    random: function() {
        var url = baseUrl + '/random',
            response = this.response;

        logger.trace('Requesting random trivia');

        // This method will not respond with anything... It will simply
        // trigger socket messages to the given client
        request(url, (err, res, body) => {
            if (err) {
                return response.status(500).send('ERROR: ' + err);
            }
            response.send('trivia message sent!');

            // Trigger the ws messages
            let questions = [];

            try {
                questions = JSON.parse(body);
            } catch (e) {
                logger.error('Could not parse questions (returning empty array): ' + e);
            }
            logger.trace('Sending random trivia to ' + this.caller.username);

            for (var i = questions.length; i--;) {
                const content = {
                    question: questions[i].question,
                    difficulty: questions[i].value,
                    answer: questions[i].answer
                };
                this.socket.sendMessage('Trivia', content);
            }
        });
        return null;
    }
};

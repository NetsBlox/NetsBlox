/**
 * The Trivia Service provides access to trivia questions using the jservice API.
 * For more information, check out https://jservice.io.
 *
 * @service
 * @category Games
 */
'use strict';

const ApiConsumer = require('../utils/api-consumer');
const Trivia = new ApiConsumer('Trivia', 'http://jservice.io/api',{cache: {ttl: 0.5}});

/**
 * Get a random trivia question.
 * This includes the question, answer, and additional information.
 * @returns {Promise<Object>}
 */
Trivia.getRandomQuestion = function() {
    const keepKeys = [
        'id',
        'question',
        'answer',
        'value',
        'category',
        'airdate',
        'invalid_count'
    ];

    return this._requestData({path: '/random'})
        .then(questions => {
            const [question] = questions.map(q => {
                const cleanedQ = {};
                keepKeys.forEach(k => cleanedQ[k] = q[k]);
                return cleanedQ;
            });

            question.category = question.category.title;
            return question;
        });
};

/**
 * Get random trivia question.
 * @deprecated
 * @returns {Promise<String>}
 */
Trivia.random = function() {
    return this._requestData({path: '/random'})
        .then(questions => {
            for (var i = questions.length; i--;) {
                const content = {
                    question: questions[i].question,
                    difficulty: questions[i].value,
                    answer: questions[i].answer
                };
                this.socket.sendMessage('Trivia', content);
            }
            return 'trivia message sent!';
        });
};

module.exports = Trivia;

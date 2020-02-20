/**
 * The TwentyQuestions Service aids in the creation of a multiplayer
 * game of twenty questions.
 *
 * @service
 * @category Games
 */
'use strict';

let TwentyQuestions = function () {
    this._state = {};
    this._state.correctAnswer = null;
    this._state.guessCount = null;
    this._state.answerer = null;
    this._state.started = false;
};

TwentyQuestions.prototype._ensureGameStarted = function (started = true) {
    if (this._state.started !== started) {
        const msg = this._state.started ? 'Game has already started.':
            'Game has not yet started.';
        throw new Error(msg);
    }
};

TwentyQuestions.prototype._ensureCallerIsAnswerer = function () {
    if (this.caller.roleId !== this._state.answerer) {
        const msg = 'You\'re not the answerer!';
        throw new Error(msg);
    }
};

TwentyQuestions.prototype._ensureCallerIsGuesser = function () {
    if (this.caller.roleId === this._state.answerer) {
        const msg = 'You\'re not the guesser!';
        throw new Error(msg);
    }
};

/**
 * Start a new game of twenty questions.
 *
 * @param {String} answer The word or phrase to guess
 */
TwentyQuestions.prototype.start = function (answer) {
    this._ensureGameStarted(false);

    // set variables appropriately
    this._state.started = true;
    this._state.guessCount = 0;
    this._state.correctAnswer = answer.toLowerCase();
    this._state.answerer = this.caller.roleId;
    this.socket.sendMessageToRoom('start');
    return true;
};

/**
 * Guess the word or phrase.
 *
 * @param {String} guess word or phrase
 */
TwentyQuestions.prototype.guess = function(guess) {
    this._ensureGameStarted();
    this._ensureCallerIsGuesser();

    // split the guess
    var correct = false;
    var attempt = guess.toLowerCase().split(/[\s\?]+/);
    for (var i = 0; i < attempt.length && !correct; i++) {
        if (attempt[i] === this._state.correctAnswer) {
            correct = true;
        }
    }

    this._state.guessCount++;
    const content = {
        turn: this._state.guessCount
    };
    // incorrect guess
    if (!correct) {
        // guesses are up! guesser loses...
        if (this._state.guessCount === 20) {
            content.GuesserWin = false;
            this.socket.sendMessageToRoom('EndGame', content);
        // wait for answerer to answer the question
        } else {
            content.guess = guess;
            this.socket.sendMessageToRoom('EndGuesserTurn', content);
        }
        return correct;
    }
    // correct guess, end the game
    content.GuesserWin = true;
    this.socket.sendMessageToRoom('EndGame', content);
    return true;
};

/**
 * Answer a yes or no question about the secret word or phrase.
 *
 * @param {String} answer yes or no response to previous question
 */
TwentyQuestions.prototype.answer = function(answer) {
    this._ensureGameStarted();
    this._ensureCallerIsAnswerer();

    // ensure valid answer
    if (answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'no') {
        throw new Error('Answer the guess with yes or no!');
    }
    // end answerer's turn
    const content = {
        turn: this._state.guessCount,
        response: answer.toLowerCase()
    };
    this.socket.sendMessageToRoom('EndAnswererTurn', content);
    return true;
};

/**
 * Check if the game has been started.
 */
TwentyQuestions.prototype.gameStarted = function() {
    return this._state.started;
};

/**
 * Restart the game.
 */
TwentyQuestions.prototype.restart = function() {
    this._state.started = false;
    this._state.guessCount = 0;
    this._state.correctAnswer = '';
    this._state.answerer = '';
    return false;
};

module.exports = TwentyQuestions;

// This will help facilitate the game of "Twenty Questions"...keeping track of the answer, guess count, & player turn

'use strict';

var debug = require('debug'),
    log = debug('netsblox:rpc:twenty-questions:log'),
    error = debug('netsblox:rpc:twenty-questions:error'),
    trace = debug('netsblox:rpc:twenty-questions:trace'),
    Constants = require('../../../../common/constants');

let TwentyQuestions = function () {
    this._state.correctAnswer = null;
    this._state.guessCount = null;
    this._state.answerer = null;
    this._state.started = false;
    this.isStateless = false;
};

TwentyQuestions.getPath = () => '/twentyquestions';

TwentyQuestions.prototype.start = function (answer) {

    // safeguard against starting in the middle of a game
    if (this._state.started) {
        return 'Game has already started...';
    }
    // ensure valid answer
    if (answer === '') {
        return 'No answer received';
    }
    // set variables appropriately
    this._state.started = true;
    this._state.guessCount = 0;
    this._state.correctAnswer = answer.toLowerCase();
    this._state.answerer = this.socket.roleId;
    // send start message to everyone
    this.socket._room.sockets()
        .forEach(socket => socket.send({
            type: 'message',
            dstId: Constants.EVERYONE,
            msgType: 'start',
            content: {}
        }));
    return true;
};

TwentyQuestions.prototype.guess = function(guess) {
    // safeguard against guessing before a game has started
    if (!this._state.started) {
        return 'Game hasn\'t started yet...wait for the answerer to think of something!';
    }
    // safeguard against the answerer accidentally attempting to guess
    if (this.socket.roleId === this._state.answerer) {
        return 'You\'re not the guesser!';
    }
    // ensure valid guess
    if (guess === '') {
        return 'Enter a guess!';
    }

    // split the guess
    var correct = false;
    var attempt = guess.toLowerCase().split(/[\s\?]+/);
    for (var i = 0; i < attempt.length && !correct; i++) {
        if (attempt[i] === this._state.correctAnswer) {
            correct = true;
        }
    }

    this._state.guessCount++;
    let msgSocket = {
        type: 'message',
        dstId: Constants.EVERYONE,
        content: {
            turn: this._state.guessCount
        }
    };
    // incorrect guess
    if (!correct) {
        // guesses are up! guesser loses...
        if (this._state.guessCount === 20) {
            this.socket._room.sockets()
            .forEach(socket => {
                let msg = msgSocket;
                msg.msgType = 'EndGame';
                msg.content.GuesserWin = false;
                socket.send(msg);
            });
        // wait for answerer to answer the question
        } else {
            this.socket._room.sockets()
            .forEach(socket => {
                let msg = msgSocket;
                msg.msgType = 'EndGuesserTurn';
                msg.content.guess = guess;
                socket.send(msg);
            });
        }
        return true;
    }
    // correct guess, end the game
    this.socket._room.sockets()
        .forEach(socket => {
            let msg = msgSocket;
            msg.msgType = 'EndGame';
            msg.content.GuesserWin = true;
            socket.send(msg);
        });
    return true;
};

TwentyQuestions.prototype.answer = function(answer) {
    // safeguard against answering before a game has started
    if (!this._state.started) {
        return this.response.send('Game hasn\'t started yet...think of something to be guessed!');
    }
    // safeguard against the guesser accidently attempting to answer
    if (this.socket.roleId !== this._state.answerer) {
        return this.response.send('You\'re not the answerer!');
    }
    // ensure valid answer
    if (answer === '' || answer.toLowerCase() !== 'yes' && answer.toLowerCase() !== 'no') {
        return this.response.send('Answer the guess with yes/no!');
    }
    // end answerer's turn
    this.socket._room.sockets()
        .forEach(socket => socket.send({
            type: 'message',
            dstId: Constants.EVERYONE,
            msgType: 'EndAnswererTurn',
            content: {
                turn: this._state.guessCount,
                response: answer.toLowerCase()
            }
        }));
    return true;
};

// return whether or not the game has already started
TwentyQuestions.prototype.gameStarted = function() {
    return this._state.started;
};

// restart the game, resetting all the variables...
TwentyQuestions.prototype.restart = function() {
    this._state.started = false;
    this._state.guessCount = 0;
    this._state.correctAnswer = '';
    this._state.answerer = '';
    return false;
};

module.exports = TwentyQuestions;

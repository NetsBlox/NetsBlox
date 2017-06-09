// This will help facilitate the game of "Twenty Questions"...keeping track of the answer, guess count, & player turn

'use strict';

var debug = require('debug'),
    log = debug('netsblox:rpc:twenty-questions:log'),
    error = debug('netsblox:rpc:twenty-questions:error'),
    trace = debug('netsblox:rpc:twenty-questions:trace'),
    Constants = require('../../../../common/constants');

let TwentyQuestions = function () {
    this.correctAnswer = null;
    this.guessCount = null;
    this.answerer = null;
    this.started = false;
    this.isStateless = false;
};

TwentyQuestions.getPath = () => '/twentyquestions';

TwentyQuestions.prototype.start = function (answer) {
    
    // safeguard against starting in the middle of a game
    if (this.started) {
        return 'Game has already started...';
    }
    // ensure valid answer
    if (answer === '') {
        return 'No answer received';
    }
    // set variables appropriately
    this.started = true;
    this.guessCount = 0;
    this.correctAnswer = answer.toLowerCase();
    this.answerer = this.socket.roleId;
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
    if (!this.started) {
        return 'Game hasn\'t started yet...wait for the answerer to think of something!';
    }
    // safeguard against the answerer accidentally attempting to guess
    if (this.socket.roleId === this.answerer) {
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
        if (attempt[i] === this.correctAnswer) {
            correct = true;
        }
    }

    this.guessCount++;
    let msgSocket = {
        type: 'message',
        dstId: Constants.EVERYONE,
        content: {
            turn: this.guessCount
        }
    };
    // incorrect guess
    if (!correct) {
        // guesses are up! guesser loses...
        if (this.guessCount === 20) {
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
    if (!this.started) {
        return this.response.send('Game hasn\'t started yet...think of something to be guessed!');
    }
    // safeguard against the guesser accidently attempting to answer
    if (this.socket.roleId !== this.answerer) {
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
                turn: this.guessCount,
                response: answer.toLowerCase()
            }
        }));
    return true;
};

// return whether or not the game has already started
TwentyQuestions.prototype.gameStarted = function() {
    return this.started;
};

// restart the game, resetting all the variables...
TwentyQuestions.prototype.restart = function() {
    this.started = false;
    this.guessCount = 0;
    this.correctAnswer = '';
    this.answerer = '';
    return false;
};

module.exports = TwentyQuestions;

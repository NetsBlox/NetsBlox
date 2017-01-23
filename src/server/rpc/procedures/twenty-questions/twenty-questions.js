// This will help facilitate the game of "Twenty Questions"...keeping track of the answer, guess count, & player turn

'use strict';

var debug = require('debug'),
    log = debug('netsblox:rpc:twenty-questions:log'),
    error = debug('netsblox:rpc:twenty-questions:error'),
    trace = debug('netsblox:rpc:twenty-questions:trace'),
    Constants = require('../../../../common/constants');

var correctAnswer, // hold the answer
    guessCount, // keep track of amount of guesses made so far
    answerer, // answerer role
    started = false; // keep track of if the game has stared or not

module.exports = {

    isStateless: true, 
    getPath: () => '/twentyquestions',

    start: function(answer) {
        // safeguard against starting in the middle of a game
        if (started) {
            return 'Game has already started...';
        }
        // ensure valid answer
        if (answer === '') {
            return 'No answer received';
        }
        // set variables appropriately
        started = true;
        guessCount = 0;
        correctAnswer = answer.toLowerCase();
        answerer = this.socket.roleId;
        // send start message to everyone
        this.socket._room.sockets()
            .forEach(socket => socket.send({
                type: 'message',
                dstId: Constants.EVERYONE,
                msgType: 'start',
                content: {}
            }));
        return true;
    },

    guess: function(guess) {
        // safeguard against guessing before a game has started
        if (!started) {
            return 'Game hasn\'t started yet...wait for the answerer to think of something!';
        }
        // safeguard against the answerer accidentally attempting to guess
        if (this.socket.roleId == answerer) {
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
            if (attempt[i] == correctAnswer) {
                correct = true;
            }
        }

        guessCount++;
        
        // incorrect guess
        if (!correct) {
            // guesses are up! guesser loses...
            if (guessCount == 20) {
                this.socket._room.sockets()
                .forEach(socket => socket.send({
                    type: 'message',
                    dstId: Constants.EVERYONE,
                    msgType: 'EndGame',
                    content: {
                        turn: guessCount,
                        GuesserWin: false
                    }
                }));
            // wait for answerer to answer the question
            } else {
                this.socket._room.sockets()
                .forEach(socket => socket.send({
                    type: 'message',
                    dstId: Constants.EVERYONE,
                    msgType: 'EndGuesserTurn',
                    content: {
                        turn: guessCount,
                        guess: guess
                    }
                }));
            }
            return true;
        } 
        // correct guess, end the game
        this.socket._room.sockets()
            .forEach(socket => socket.send({
                type: 'message',
                dstId: Constants.EVERYONE,
                msgType: 'EndGame',
                content: {
                    turn: guessCount,
                    GuesserWin: true
                }
            }));
        return true;
    },

    answer: function(answer) {
        // safeguard against answering before a game has started
        if (!started) {
            return this.response.send('Game hasn\'t started yet...think of something to be guessed!');
        }
        // safeguard against the guesser accidently attempting to answer
        if (this.socket.roleId != answerer) {
            return this.response.send('You\'re not the answerer!');
        }
        // ensure valid answer
        if (answer === '' || answer.toLowerCase() != 'yes' && answer.toLowerCase() != 'no') {
            return this.response.send('Answer the guess with yes/no!');
        }
        // end answerer's turn
        this.socket._room.sockets()
            .forEach(socket => socket.send({
                type: 'message',
                dstId: Constants.EVERYONE,
                msgType: 'EndAnswererTurn',
                content: {
                    turn: guessCount,
                    response: answer.toLowerCase()
                }
            }));
        return true;
    },

    // return whether or not the game has already started
    gameStarted: function() {
        return started;
    },

    // restart the game, resetting all the variables...
    restart: function() {
        started = false;
        guessCount = 0;
        correctAnswer = '';
        answerer = '';
        return false;
    }

};

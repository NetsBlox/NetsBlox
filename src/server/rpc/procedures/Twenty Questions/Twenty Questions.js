// This will help facilitate the game of "Twenty Questions"...keeping track of the answer, guess count, & player turn

'use strict';

var debug = require('debug'),
    log = debug('NetsBlox:RPCManager:TwentyQuestions:log'),
    error = debug('NetsBlox:RPCManager:TwentyQuestions:error'),
    trace = debug('NetsBlox:RPCManager:TwentyQuestions:trace'),
    Constants = require('../../../../common/Constants');

var correctAnswer, // hold the answer
	guessCount, // keep track of amount of guesses made so far
	answerer, // answerer role
	started = false; // keep track of if the game has stared or not

module.exports = {

	isStateless: true, 
	getPath: () => '/twentyquestions',
	getActions: () => ['start', 'guess', 'answer', 'gameStarted', 'restart'], // list of available functions for client to use

	start: function(req, res) {
		// safeguard against starting in the middle of a game
		if (started) {
			return res.send("Game has already started...");
		}
		// ensure valid answer
		if (req.query.answer === '') {
			return res.send(false);
		}
		// set variables appropriately
		started = true;
		guessCount = 0;
		correctAnswer = req.query.answer.toLowerCase();
		answerer = req.netsbloxSocket.roleId;
		// send start message to everyone
		req.netsbloxSocket._room.sockets()
            	.forEach(socket => socket.send({
                	type: 'message',
                	dstId: Constants.EVERYONE,
                	msgType: 'start',
                	content: {}
            	}));
		return res.send(true);
	},

	guess: function(req, res) {
		// safeguard against guessing before a game has started
		if (!started) {
			return res.send("Game hasn't started yet...wait for the answerer to think of something!");
		}
		// safeguard against the answerer accidentally attempting to guess
		if (req.netsbloxSocket.roleId == answerer) {
			return res.send("You're not the guesser!");
		}
		// ensure valid guess
		if (req.query.guess === '') {
			return res.send("Enter a guess!");
		}

		// split the guess
		var correct = false;
		var attempt = req.query.guess.toLowerCase().split(/[\s\?]+/);
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
				req.netsbloxSocket._room.sockets()
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
				req.netsbloxSocket._room.sockets()
            	.forEach(socket => socket.send({
                	type: 'message',
                	dstId: Constants.EVERYONE,
                	msgType: 'EndGuesserTurn',
                	content: {
                   	 	turn: guessCount,
                	    guess: req.query.guess
               		}
            	}));
        	}
        	return res.send(true);
		} 
		// correct guess, end the game
		req.netsbloxSocket._room.sockets()
           .forEach(socket => socket.send({
               type: 'message',
                dstId: Constants.EVERYONE,
                msgType: 'EndGame',
                content: {
                    turn: guessCount,
                    GuesserWin: true
                }
            }));
        return res.send(true);
		},

	answer: function(req, res) {
		// safeguard against answering before a game has started
		if (!started) {
			return res.send("Game hasn't started yet...think of something to be guessed!");
		}
		// safeguard against the guesser accidently attempting to answer
		if (req.netsbloxSocket.roleId != answerer) {
			return res.send("You're not the answerer!");
		}
		// ensure valid answer
		if (req.query.answer === '' || req.query.answer.toLowerCase() != 'yes' && req.query.answer.toLowerCase() != 'no') {
			return res.send("Answer the guess with yes/no!")
		}
		// end answerer's turn
		req.netsbloxSocket._room.sockets()
            .forEach(socket => socket.send({
                type: 'message',
                dstId: Constants.EVERYONE,
                msgType: 'EndAnswererTurn',
                content: {
                    turn: guessCount,
                    response: req.query.answer.toLowerCase()
                }
            }));
        return res.send(true);
	},

	// return whether or not the game has already started
	gameStarted: function(req, res) {
		return res.send(started);
	},

	// restart the game, resetting all the variables...
	restart: function(req, res) {
		started = false;
		guessCount = 0;
		correctAnswer = '';
		answerer = '';
		return res.send(false);
	}

};

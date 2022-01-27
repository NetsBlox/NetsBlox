/**
 * A simple Wordle-like word guessing game.
 *
 * @service
 * @category Games
 */

const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger')('wordguess');
const { Nodehun } = require('nodehun');
const CommonWords = require('../common-words/common-words');
const { RPCError } = require('../utils');
const _ = require('lodash');

// Setup dictionary
const dicFile = fs.readFileSync(path.join(__dirname, 'dict', 'en-custom.dic'));
const affFile = fs.readFileSync(path.join(__dirname, 'dict','en-custom.aff'));
const nodehun = new Nodehun(affFile, dicFile);    

  
const WordGuess = {};
WordGuess.serviceName = 'WordGuess';

WordGuess._states = {

};


WordGuess._GameState = {
    Playing: 'Playing',
    Won: 'Won',
    Lost: 'Lost',
};

const MAX_TIME = 24 * 60 * 60;

WordGuess._cleanStates = function () {
    WordGuess._states = _.pickBy(WordGuess._states, state => {
        return Date.now() - state.time < MAX_TIME;
    });
};

/**
 * Choose a random word of a specific length
 * @param {BoundedInteger<3,20>} length Length of word to search for
 * @returns {String} A random word of the given length
 */
WordGuess._getRandomCommonWord = function (length) {
    const possibilities = CommonWords.getWords('en', 1, 10000).filter(word => word.length == length);

    if (possibilities.length == 0) {
        throw new RPCError('No words available of that length.');
    }

    return possibilities[Math.floor(Math.random() * possibilities.length)];
};

/**
 * Start the guessing game by having the computer choose a random word
 * @param {BoundedInteger<3,10>=} length Length of word to search for (default ``5``)
 */
WordGuess.start = function (length = 5) {
    WordGuess._states[this.caller.clientId] = {
        time: Date.now(),
        word: WordGuess._getRandomCommonWord(length),
        gamestate: WordGuess._GameState.Playing
    };

    logger.log('Word is: ' + WordGuess._states[this.caller.clientId].word);
};

/**
 * Make an attempt and receive feedback
 * @param {BoundedString<3,10>} word Guess for this round
 */
WordGuess.guess = function (word) {
    // Check the user has an existing game
    if (!Object.keys(WordGuess._states).includes(this.caller.clientId)) {
        throw new RPCError('No game in progress');
    }

    if (WordGuess._states[this.caller.clientId].gamestate != WordGuess._GameState.Playing) {
        throw new RPCError('Game already complete');        
    }

    // Reject words of wrong length
    let realWord = WordGuess._states[this.caller.clientId].word.split('');
    if (word.length != realWord.length) {
        throw new RPCError('Guess should have length ' + realWord.length);        
    }

    // Require word to be in dictionary
    if (!nodehun.spellSync(word)) {
        throw new RPCError('Invalid word');        
    }

    WordGuess._states[this.caller.clientId].time = Date.now();

    // Match word
    let matches = [];

    // Find exact matches
    for (let i = 0; i < realWord.length; i++) {
        if (word[i] == realWord[i]) {
            matches.push(3);
            realWord[i] = '-';
        } else {
            matches.push(1);
        }
    }

    logger.log(realWord);

    // Find near-match
    for (let i = 0; i < realWord.length; i++) {
        if (realWord.indexOf(word[i]) != -1) {
            matches[i] = 2;
            realWord[realWord.indexOf(word[i])] = '-';
        }
    }

    // Check for won game
    if (_.sum(matches) == word.length * 3) {
        WordGuess._states[this.caller.clientId].gamestate = WordGuess._GameState.Won;
    }

    return matches;
};

/**
 * Give up on the current game and learn the target word
 */
WordGuess.giveUp = function () {
    // Check the user has an existing game
    if (!Object.keys(WordGuess._states).includes(this.caller.clientId)) {
        throw new RPCError('No game in progress');
    }

    if (WordGuess._states[this.caller.clientId].gamestate != WordGuess._GameState.Playing) {
        throw new RPCError('Game complete');        
    }

    WordGuess._states[this.caller.clientId].gamestate = WordGuess._GameState.Lost;

    return WordGuess._states[this.caller.clientId].word;
};

module.exports = WordGuess;
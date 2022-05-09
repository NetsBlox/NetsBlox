/**
 * A simple Wordle-like word guessing game.
 *
 * @alpha
 * @service
 * @category Games
 */

const fs = require('fs');
const path = require('path');
const { Nodehun } = require('nodehun');
const CommonWords = require('../common-words/common-words');
const { RPCError } = require('../utils');
const _ = require('lodash');

// Setup dictionary
const dicFile = fs.readFileSync(path.join(__dirname, 'dict', 'en-custom.dic'));
const affFile = fs.readFileSync(path.join(__dirname, 'dict', 'en-custom.aff'));
const nodehun = new Nodehun(affFile, dicFile);

const wordleGuesses = fs.readFileSync(path.join(__dirname, 'dict', 'wordle', 'valid-words.csv')).toString().split('\n');
const wordleAnswers = fs.readFileSync(path.join(__dirname, 'dict', 'wordle', 'word-bank.csv')).toString().split('\n');

const WordGuess = {};

WordGuess._states = {

};

WordGuess._GameState = {
    Playing: 'Playing',
    Won: 'Won',
    Lost: 'Lost',
};

const MAX_TIME = 24 * 60 * 60;

/**
 * Clean up old gamestates
 */
WordGuess._cleanStates = function () {
    WordGuess._states = _.pickBy(WordGuess._states, state => {
        return Date.now() - state.time < MAX_TIME;
    });
};

setInterval(WordGuess._cleanStates, 24 * 60 * 60 * 1000);

/**
 * Choose a random word of a specific length
 * @param {BoundedInteger<3,20>} length Length of word to search for
 * @param {Function?} filter Optional filter to apply to words
 * @returns {String} A random word of the given length
 */
WordGuess._getRandomCommonWord = function (length, filter = () => true) {
    // Special case for 5-letter words to use Wordle list
    if (length == 5) {
        return wordleAnswers[_.random(wordleAnswers.length - 1)];
    }

    const possibilities = CommonWords.getWords('en', 1, 10000).filter(word => word.length == length && filter(word));

    if (possibilities.length == 0) {
        throw new RPCError('No words available of that length.');
    }

    return possibilities[_.random(possibilities.length - 1)];
};

/**
 * Start the guessing game by having the computer choose a random word
 * with the given length.
 * @param {BoundedInteger<3,10>=} length Length of word to search for (default ``5``)
 */
WordGuess.start = function (length = 5) {
    WordGuess._states[this.caller.clientId] = {
        time: Date.now(),
        word: WordGuess._getRandomCommonWord(length),
        gamestate: WordGuess._GameState.Playing
    };
};

/**
 * Guess the word. Returns a list where each item is the feedback for
 * the corresponding character. Feedback is a "3" if the character is
 * correct, "2" if it is correct but in the wrong place, and "1" if the
 * letter is not present in the word.
 *
 * @param {BoundedString<3,10>} word Guess for this round
 */
WordGuess.guess = function (word) {
    word = word.toLowerCase();

    // Check the user has an existing game
    if (!Object.keys(WordGuess._states).includes(this.caller.clientId)) {
        throw new RPCError('No game in progress');
    }

    if (WordGuess._states[this.caller.clientId].gamestate != WordGuess._GameState.Playing) {
        throw new RPCError('Game already complete');
    }

    // Reject words of wrong length
    let realWord = WordGuess._states[this.caller.clientId].word;
    this._validateGuess(word, realWord);

    WordGuess._states[this.caller.clientId].time = Date.now();

    // Match word
    const matches = WordGuess._calculateMatches(realWord, word);

    // Check for won game
    if (_.sum(matches) == word.length * 3) {
        WordGuess._states[this.caller.clientId].gamestate = WordGuess._GameState.Won;
    }

    return matches;
};

/**
 * Calculate result for a guess in the game
 * @param {String} realWord Secret word to match
 * @param {String} word Word guessed by user
 * @returns {Array} Array of integers corresponding to result
 */
WordGuess._calculateMatches = function (realWord, word) {
    const realLetters = realWord.split('');

    let matches = [];

    // Find exact matches
    for (let i = 0; i < realWord.length; i++) {
        if (word[i] == realLetters[i]) {
            matches.push(3);
            realLetters[i] = '-';
        } else {
            matches.push(1);
        }
    }

    // Find near-match
    for (let i = 0; i < realWord.length; i++) {
        if (matches[i] == 1 && realLetters.includes(word[i])) {
            matches[i] = 2;
            realLetters[realWord.indexOf(word[i])] = '-';
        }
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

/**
 * Check that a user's guess is valid length and in dictionary. Throws RPCError if either is false.
 * @param {String} guess User's guess
 * @param {String} realWord Solution word
 */
WordGuess._validateGuess = function (guess, realWord) {
    // Length test
    if (guess.length != realWord.length) {
        throw new RPCError('Guess should have length ' + realWord.length);
    }

    // Special case for Wordle-size games
    if (realWord.length == 5) {
        if (!wordleGuesses.includes(guess)) {
            throw new RPCError('Invalid word');
        }
        return;
    }

    // Require word to be in dictionary
    if (!guess.match(/\p{L}+/gu) || !nodehun.spellSync(guess)) {
        throw new RPCError('Invalid word');
    }
};

module.exports = WordGuess;
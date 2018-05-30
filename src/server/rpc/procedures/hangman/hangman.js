// This is a hangman set of RPC's which will mediate a game of hangman
'use strict';

const logger = require('../utils/logger')('public-roles');
const Hangman = function() {
    this._state = {};
    this._state.word = null;
    this._state.wrongGuesses = 0;
    this._state.knownIndices = [];
};

// Actions
Hangman.prototype.setWord = function(word) {
    // TODO: Make sure the chooser is the only one calling this
    this._state.word = word;
    this._state.wrongGuesses = 0;
    this._state.knownIndices = [];
    logger.info('Setting word to "'+this._state.word+'"');
};

Hangman.prototype.getCurrentlyKnownWord = function() {
    var letters = this._state.word.split('').map(function() {
        return '_';
    });

    this._state.knownIndices.forEach(function(index) {
        letters[index] = this._state.word[index];
    }, this);
    logger.trace('Currently known word is "'+letters.join(' ')+'"');
    logger.trace('word is '+this._state.word);
    return letters.join(' ');
};

Hangman.prototype.guess = function(letter) {
    var indices,
        added;

    if (!letter) {
        return 'ERROR: no letter provided';
    }

    letter = letter[0];
    logger.trace('Guessing letter: '+letter);
    indices = Hangman.getAllIndices(this._state.word, letter);
    added = Hangman.merge(this._state.knownIndices, indices);
    if (added === 0) {
        this._state.wrongGuesses++;
    }
    return indices.map(index => index + 1);
};

Hangman.prototype.isWordGuessed = function() {
    var isComplete = !!this._state.word && this._state.word.length === this._state.knownIndices.length;
    return isComplete;
};

Hangman.prototype.getWrongCount = function() {
    logger.trace('wrong count is '+this._state.wrongGuesses);
    return this._state.wrongGuesses;
};

// Private
Hangman.getAllIndices = function(word, letter) {
    var index = word.indexOf(letter),
        offset = 0,
        indices = [];

    while (index > -1) {
        indices.push(index+offset);
        offset += index + 1;
        word = word.substring(index+1);
        index = word.indexOf(letter);
    }

    return indices;
};

Hangman.merge = function(array1, array2) {
    var added = 0;
    for (var i = array2.length; i--;){
        if (array1.indexOf(array2[i]) === -1) {
            array1.push(array2[i]);
            ++added;
        }
    }
    return added;
};

module.exports = Hangman;

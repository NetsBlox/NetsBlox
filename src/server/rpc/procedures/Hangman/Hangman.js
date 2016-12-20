// This is a hangman set of RPC's which will mediate a game of hangman
'use strict';

var debug = require('debug'),
    trace = debug('NetsBlox:RPCManager:Hangman:trace'),
    info = debug('NetsBlox:RPCManager:Hangman:info');

var Hangman = function() {
    this.word = null;
    this.wrongGuesses = 0;
    this.knownIndices = [];
};

Hangman.getPath = function() {
    return '/hangman';
};

// Actions
Hangman.prototype.setWord = function(word) {
    // TODO: Make sure the chooser is the only one calling this
    this.word = word;
    this.wrongGuesses = 0;
    this.knownIndices = [];
    info('Setting word to "'+this.word+'"');
};

Hangman.prototype.getCurrentlyKnownWord = function() {
    var letters = this.word.split('').map(function() { 
        return '_'; 
    });

    this.knownIndices.forEach(function(index) {
        letters[index] = this.word[index];
    }, this);
    trace('Currently known word is "'+letters.join(' ')+'"');
    trace('word is '+this.word);
    return letters.join(' ');
};

Hangman.prototype.guess = function(letter) {
    var indices,
        added;

    if (!letter) {
        return 'ERROR: no letter provided';
    }

    letter = letter[0];
    trace('Guessing letter: '+letter);
    indices = Hangman.getAllIndices(this.word, letter);
    added = Hangman.merge(this.knownIndices, indices);
    if (added === 0) {
        this.wrongGuesses++;
    }
    return indices.map(index => index + 1);
};

Hangman.prototype.isWordGuessed = function() {
    var isComplete = !!this.word && this.word.length === this.knownIndices.length;
    return isComplete;
};

Hangman.prototype.getWrongCount = function() {
    trace('wrong count is '+this.wrongGuesses);
    return this.wrongGuesses;
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

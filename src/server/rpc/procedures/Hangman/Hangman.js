// This is a hangman set of RPC's which will mediate a game of hangman
'use strict';

var debug = require('debug'),
    log = debug('NetsBlox:RPCManager:Hangman:log'),
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

Hangman.getActions = function() {
    return ['guess', 
            'setWord',
            'getWrongCount',
            'getCurrentlyKnownWord',
            'isWordGuessed'];
};

// Actions
Hangman.prototype.setWord = function(req, res) {
    // TODO: Make sure the chooser is the only one calling this
    this.word = req.query.word;
    this.wrongGuesses = 0;
    this.knownIndices = [];
    info('Setting word to "'+this.word+'"');
    res.sendStatus(200);
};

Hangman.prototype.getCurrentlyKnownWord = function(req, res) {
    var letters = this.word.split('').map(function() { 
        return '_'; 
    });

    this.knownIndices.forEach(function(index) {
        letters[index] = this.word[index];
    }, this);
    trace('Currently known word is "'+letters.join(' ')+'"');
    trace('word is '+this.word);
    return res.status(200).send(letters.join(' '));
};

Hangman.prototype.guess = function(req, res) {
    var letter = req.query.letter[0],
        indices,
        added;

    trace('Guessing letter: '+letter);
    indices = Hangman.getAllIndices(this.word, letter);
    added = Hangman.merge(this.knownIndices, indices);
    if (added === 0) {
        this.wrongGuesses++;
    }
    return res.status(200).send(indices);
};

Hangman.prototype.isWordGuessed = function(req, res) {
    var isComplete = this.word.length === this.knownIndices.length;
    res.status(200).send(isComplete);
};

Hangman.prototype.getWrongCount = function(req, res) {
    trace('wrong count is '+this.wrongGuesses);
    res.status(200).send(this.wrongGuesses+'');
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

// This is a hangman set of RPC's which will select a word for the student to
// try to guess
'use strict';

// Word list
var words = ['accurate','address', 'afford','alert','analyze','ancestor',
'annual','apparent','appropriate','arena','arrest','ascend','assist','attempt',
'attentive','attractive','awkward','baggage','basic','benefit','blend','blossom',
'burrow','calculate','capable','captivity','carefree','century','chamber',
'circular','coax','column','communicate','competition','complete','concentrate',
'concern','conclude','confuse','congratulate','considerable','content','contribute',
'crafty','create','demonstrate','descend','desire','destructive','develop','disaster',
'disclose','distract','distress','dusk','eager','ease','entertain','entire','entrance',
'envy','essential','extraordinary','flexible','focus','fragile','frantic','frequent',
'frontier','furious','generosity','hail','hardship','heroic','host','humble','Impact',
'increase','indicate','inspire','instant','invisible','jagged','lack','limb','limp',
'manufacture','master','mature','meadow','mistrust','mock','modest','noble','orchard',
'outstanding','peculiar','peer','permit','plead','plentiful','pointless','portion',
'practice','precious','prefer','prepare','proceed','queasy','recent','recognize','reduce',
'release','represent','request','resist','response','reveal','routine','severe','shabby',
'shallow','sole','source','sturdy','surface','survive','terror','threat','tidy','tour',
'tradition','tragic','typical','vacant','valiant','variety','vast','venture','weary',];

var debug = require('debug'),
    log = debug('NetsBlox:RPCManager:SimpleHangman:log'),
    trace = debug('NetsBlox:RPCManager:SimpleHangman:trace'),
    info = debug('NetsBlox:RPCManager:SimpleHangman:info');

var SimpleHangman = function() {
    this.word = null;
    this.wrongGuesses = 0;
    this.knownIndices = [];

    this._restart();
};

SimpleHangman.getPath = function() {
    return '/simplehangman';
};

SimpleHangman.getActions = function() {
    return ['guess', 
            'restart',
            'getWrongCount',
            'getCurrentlyKnownWord',
            'isWordGuessed'];
};

// Actions
SimpleHangman.prototype.restart = function(req, res) {
    this._restart();
    res.sendStatus(200);
};

SimpleHangman.prototype.getCurrentlyKnownWord = function(req, res) {
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

SimpleHangman.prototype.guess = function(req, res) {
    var letter = req.query.letter[0],
        indices,
        added;

    trace('Guessing letter: '+letter);
    indices = SimpleHangman.getAllIndices(this.word, letter);
    added = SimpleHangman.merge(this.knownIndices, indices);
    if (added === 0) {
        this.wrongGuesses++;
    }
    return res.status(200).send(indices);
};

SimpleHangman.prototype.isWordGuessed = function(req, res) {
    var isComplete = this.word.length === this.knownIndices.length;
    res.status(200).send(isComplete);
};

SimpleHangman.prototype.getWrongCount = function(req, res) {
    trace('wrong count is '+this.wrongGuesses);
    res.status(200).send(this.wrongGuesses+'');
};

// Private
/**
 * Get a new random word
 *
 * @return {undefined}
 */
SimpleHangman.prototype._restart = function() {
    var index = Math.floor(Math.random()*words.length);
    this.word = words[index];
    this.wrongGuesses = 0;
    this.knownIndices = [];
};

SimpleHangman.getAllIndices = function(word, letter) {
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

SimpleHangman.merge = function(array1, array2) {
    var added = 0;
    for (var i = array2.length; i--;){
        if (array1.indexOf(array2[i]) === -1) {
            array1.push(array2[i]);
            ++added;
        }
    }
    return added;
};

module.exports = SimpleHangman;

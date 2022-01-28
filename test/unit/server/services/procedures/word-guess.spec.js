const WordGuess = require('../../../../../src/server/services/procedures/word-guess/word-guess');
const utils = require('../../../../assets/utils');
const RPCMock = require('../../../../assets/mock-service');
const assert = require('assert');
const { RPCError } = require('../../../../../src/server/services/procedures/utils');

describe(utils.suiteName(__filename), function () {
    let wordguess;

    utils.verifyRPCInterfaces('WordGuess', [
        ['giveUp', []],
        ['guess', ['word']],
        ['start', ['length']]
    ]);

    beforeEach(function() {
        wordguess = new RPCMock(WordGuess);
    });

    it('should generate words of requested length', function () {
        for (let i = 3; i < 12; i++) {            
            assert.equal(WordGuess._getRandomCommonWord(i).length, i);
        }
    });

    it('giveUp should return word and end game', function () {
        wordguess.start(5);
        assert.equal(wordguess.giveUp(), WordGuess._states[Object.keys(WordGuess._states)[0]].word);
        assert.equal(WordGuess._states[Object.keys(WordGuess._states)[0]].gamestate, WordGuess._GameState.Lost);
        delete WordGuess._states[Object.keys(WordGuess._states)[0]];
    });

    it('correct guess should win game', function () {
        wordguess.start(5);
        assert(wordguess.guess(WordGuess._states[Object.keys(WordGuess._states)[0]].word));
        assert.equal(WordGuess._states[Object.keys(WordGuess._states)[0]].gamestate, WordGuess._GameState.Won);
        delete WordGuess._states[Object.keys(WordGuess._states)[0]];
    });

    it('bad guess should throw', function () {
        wordguess.start(5);

        // Wrong length
        assert.throws(() => { wordguess.guess('aaa'); }, RPCError);

        // Invalid word
        assert.throws(() => { wordguess.guess('aaaaa'); }, RPCError);

        // Valid attempt
        assert.doesNotThrow(() => { wordguess.guess('apple'); });

        delete WordGuess._states[Object.keys(WordGuess._states)[0]];
    });

    it('should return 3s when multiple letters are in correct places', function () {
        const feedback = WordGuess._calculateMatches('crack', 'c__c_');
        assert.deepEqual(feedback, [3, 1, 1, 3, 1]);
    });
});

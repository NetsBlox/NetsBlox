const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function () {
    utils.verifyRPCInterfaces('DailyWordGuess', [
        ['giveUp', []],
        ['guess', ['word']],
        ['timeRemaining', []],
        ['triesRemaining', []]
    ]);
    
    
    const assert = require('assert');
    const DailyWordGuess = utils.reqSrc('services/procedures/daily-word-guess/daily-word-guess');
    before(() => utils.reset());

    it('two simultaneous requests to _getDailyWord should have same result', async function () {
        const currentWordList = await Promise.all([
            DailyWordGuess._getDailyWord(),
            DailyWordGuess._getDailyWord(),
            DailyWordGuess._getDailyWord(),
            DailyWordGuess._getDailyWord(),
            DailyWordGuess._getDailyWord(),
            DailyWordGuess._getDailyWord(),
            DailyWordGuess._getDailyWord(),
            DailyWordGuess._getDailyWord()
        ]);
        assert.deepEqual(currentWordList, new Array(currentWordList.length).fill(currentWordList[0]));
    });
});

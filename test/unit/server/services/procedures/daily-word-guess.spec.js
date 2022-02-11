const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function () {
    utils.verifyRPCInterfaces('DailyWordGuess', [
        ['giveUp', []],
        ['guess', ['word']],
        ['timeRemaining', []],
        ['triesRemaining', []]
    ]);
});

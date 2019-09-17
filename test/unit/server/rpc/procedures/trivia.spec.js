describe('trivia', function() {
    const utils = require('../../../../assets/utils');

    utils.verifyRPCInterfaces('Trivia', [
        ['random'],
        ['getRandomQuestion']
    ]);
});

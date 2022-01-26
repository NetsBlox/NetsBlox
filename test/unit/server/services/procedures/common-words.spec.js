const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    utils.verifyRPCInterfaces('CommonWords', [
        ['getLanguages'],
        ['getWords', ['language', 'start', 'end']],
    ]);
});

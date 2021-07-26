const utils = require('../../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    utils.verifyRPCInterfaces('ProjectGutenberg', [
        ['getInfo', ['ID']],
        ['getText', ['ID']],
        ['search', ['field', 'text']],
    ]);
});

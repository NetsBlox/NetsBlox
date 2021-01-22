const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    utils.verifyRPCInterfaces('NewYorkPublicLibrary', [
        ['search', ['term', 'perPage', 'page']],
        ['getDetails', ['uuid']],
        ['getImage', ['itemID']]
    ]);
});

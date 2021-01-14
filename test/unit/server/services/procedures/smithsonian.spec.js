const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    utils.verifyRPCInterfaces('Smithsonian', [
        ['search', ['term', 'count', 'skip']],
        ['searchImageContent', ['term', 'count', 'skip']],
        ['getImage', ['id']]
    ]);
});

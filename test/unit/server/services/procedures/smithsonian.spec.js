describe('smithsonian', function() {
    const utils = require('../../../../assets/utils');

    utils.verifyRPCInterfaces('Smithsonian', [
        ['search', ['term', 'count', 'skip']],
        ['searchImageContent', ['term', 'count', 'skip']],
        ['getImage', ['id']]
    ]);
});

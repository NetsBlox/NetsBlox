describe('smithsonian', function() {
    const utils = require('../../../../assets/utils');

    utils.verifyRPCInterfaces('Smithsonian', [
        ['search', ['term', 'count', 'skip']],
        ['searchForImages', ['term', 'count', 'skipBeforeFilter']],
        ['getImageURLs', ['id']],
        ['getImage', ['id']]
    ]);
});

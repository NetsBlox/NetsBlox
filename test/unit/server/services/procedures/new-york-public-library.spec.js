describe('new-york-public-library', function() {
    const utils = require('../../../../assets/utils');

    utils.verifyRPCInterfaces('NewYorkPublicLibrary', [
        ['search', ['term', 'perPage', 'page']],
        ['getDetails', ['uuid']],
        ['getImage', ['itemID']]
    ]);
});

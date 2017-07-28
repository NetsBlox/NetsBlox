describe('imageSearch', function() {
    var ImageSearch = require('../../../../src/server/rpc/procedures/pixabay/pixabay'),
        RPCMock = require('../../../assets/mock-rpc'),
        utils = require('../../../assets/utils'),
        imageSearch = new RPCMock(ImageSearch);

    utils.verifyRPCInterfaces(imageSearch, [
    ['searchAll', ['keywords', 'maxHeight', 'minHeight']],
        ['searchPhoto', ['keywords', 'maxHeight', 'minHeight']],
        ['searchIllustration', ['keywords', 'maxHeight', 'minHeight']],
    ]);
});

describe('Pixabay', function() {
    var Pixabay = require('../../../../src/server/rpc/procedures/pixabay/pixabay'),
        RPCMock = require('../../../assets/mock-rpc'),
        utils = require('../../../assets/utils'),
        pixabay = new RPCMock(Pixabay);

    utils.verifyRPCInterfaces(pixabay, [
        ['searchAll', ['keywords', 'maxHeight', 'minHeight']],
        ['searchPhoto', ['keywords', 'maxHeight', 'minHeight']],
        ['searchIllustration', ['keywords', 'maxHeight', 'minHeight']]
    ]);
});

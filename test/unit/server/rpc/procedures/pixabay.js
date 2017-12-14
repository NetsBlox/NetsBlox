describe('Pixabay', function() {
    const utils = require('../../../../assets/utils');
    var Pixabay = utils.reqSrc('rpc/procedures/pixabay/pixabay'),
        RPCMock = require('../../../../assets/mock-rpc'),
        pixabay = new RPCMock(Pixabay);

    utils.verifyRPCInterfaces(pixabay, [
        ['searchAll', ['keywords', 'maxHeight', 'minHeight']],
        ['searchPhoto', ['keywords', 'maxHeight', 'minHeight']],
        ['searchIllustration', ['keywords', 'maxHeight', 'minHeight']]
    ]);
});

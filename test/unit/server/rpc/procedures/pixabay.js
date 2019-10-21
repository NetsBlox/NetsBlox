describe('Pixabay', function() {
    const utils = require('../../../../assets/utils');

    utils.verifyRPCInterfaces('Pixabay', [
        ['searchAll', ['keywords', 'maxHeight', 'minHeight']],
        ['searchPhoto', ['keywords', 'maxHeight', 'minHeight']],
        ['searchIllustration', ['keywords', 'maxHeight', 'minHeight']]
    ]);
});

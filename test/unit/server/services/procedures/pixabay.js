const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    utils.verifyRPCInterfaces('Pixabay', [
        ['getImage', ['url']],
        ['searchAll', ['keywords', 'maxHeight', 'minHeight']],
        ['searchPhoto', ['keywords', 'maxHeight', 'minHeight']],
        ['searchIllustration', ['keywords', 'maxHeight', 'minHeight']]
    ]);
});

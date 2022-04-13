const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    utils.verifyRPCInterfaces('SharedCanvas', [
        ['getCooldown'],
        ['getCooldownRemaining'],
        ['getEditCount'],
        ['getSize'],
        ['getWidth'],
        ['getHeight'],
        ['getPixel', ['x', 'y']],
        ['setPixel', ['x', 'y', 'color']],
        ['getImage', ['x', 'y', 'width', 'height', 'scale']],
    ]);
});

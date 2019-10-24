describe('ocean-data', function() {
    const utils = require('../../../../assets/utils');

    utils.verifyRPCInterfaces('OceanData', [
        ['getOxygenRatio', []],
        ['getDeepOceanTemp', []],
        ['getSurfaceTemp', []],
        ['getSeaLevel', []],
    ]);
});

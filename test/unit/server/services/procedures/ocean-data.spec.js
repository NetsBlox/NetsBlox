describe('ocean-data', function() {
    const utils = require('../../../../assets/utils');

    utils.verifyRPCInterfaces('OceanData', [
        ['getOxygenRatio', ['startYear', 'endYear']],
        ['getDeepOceanTemp', ['startYear', 'endYear']],
        ['getSurfaceTemp', ['startYear', 'endYear']],
        ['getSeaLevel', ['startYear', 'endYear']],
    ]);
});

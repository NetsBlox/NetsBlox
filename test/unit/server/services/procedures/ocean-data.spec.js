const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    utils.verifyRPCInterfaces('OceanData', [
        ['getOxygenRatio', ['startYear', 'endYear']],
        ['getDeepOceanTemp', ['startYear', 'endYear']],
        ['getSurfaceTemp', ['startYear', 'endYear']],
        ['getSeaLevel', ['startYear', 'endYear']],
    ]);
});

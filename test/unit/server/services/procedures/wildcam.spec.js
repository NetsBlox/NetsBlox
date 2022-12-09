const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    utils.verifyRPCInterfaces('Wildcam', [
        ['search', ['startDate', 'stopDate', 'species', 'latitude', 'longitude', 'radius']],
        ['getImage', ['entry']],
        ['getSpeciesList', []],
    ]);
});

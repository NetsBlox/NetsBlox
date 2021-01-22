const utils = require('../../../../assets/utils');

describe(utils.suiteName(__filename), function() {
    utils.verifyRPCInterfaces('HurricaneData', [
        ['getHurricaneData', ['name', 'year']],
        ['getHurricanesInYear', ['year']],
        ['getYearsWithHurricaneNamed', ['name']],
    ]);
});

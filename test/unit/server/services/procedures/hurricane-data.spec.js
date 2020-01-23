describe('hurricane-tracking', function() {
    const utils = require('../../../../assets/utils');

    utils.verifyRPCInterfaces('HurricaneData', [
        ['getHurricaneData', ['name', 'year']],
        ['getHurricanesInYear', ['year']],
        ['getYearsWithHurricaneNamed', ['name']],
    ]);
});
